# =============================================================
# Multi-Agent LangGraph Application
#1 Orchestrator Agent  -> reasons with model, routes to workers
#2 Recommendation Agent -> reasons with model + calls tool 
#3 Order Management Node -> pure node, calls Lambda
#4 Order Tracking Node   -> pure node, calls Lambda
# =============================================================
import json
import os
import boto3

from langchain_core.tools import tool
from langchain_aws import ChatBedrockConverse

from langgraph.graph import StateGraph, START, END
from typing_extensions import TypedDict
from typing import Annotated
from langgraph.graph.message import add_messages
from langchain_core.messages import AnyMessage, AIMessage, SystemMessage, ToolMessage

from langchain.agents import create_agent

#from langgraph.checkpoint.memory import MemorySaver

# =============================================================
# 1. TOOLS
# =============================================================
client = boto3.client("lambda", region_name=os.getenv("AWS_REGION", "us-east-1"))
kb_client = boto3.client("bedrock-agent-runtime", region_name=os.getenv("AWS_REGION", "us-east-1"))
KNOWLEDGE_BASE_ID = os.getenv("BEDROCK_KNOWLEDGE_BASE_ID", "JV19IHUE3C")


def retrieve_context(prompt: str, client_override=None) -> list[dict]:
    """Fetch grounding chunks from the configured Bedrock Knowledge Base."""
    response = (client_override or kb_client).retrieve(
        knowledgeBaseId=KNOWLEDGE_BASE_ID,
        retrievalQuery={"text": prompt},
        retrievalConfiguration={"vectorSearchConfiguration": {"numberOfResults": 8}},
    )
    return [
        {"text": item.get("content", {}).get("text", ""), "source": item.get("location", {})}
        for item in response.get("retrievalResults", [])
    ]


@tool
def recommend_products(prompt: str) -> list[dict]:
    """Retrieve matching products from the Bedrock product-catalog Knowledge Base."""
    return retrieve_context(prompt)


@tool
def place_order(product_id: str, quantity: int) -> dict:
    """Place an order for a product with given quantity."""
    response = client.invoke(
        FunctionName="place_orders",
        InvocationType="RequestResponse",
        Payload=json.dumps({"product_id": product_id, "quantity": quantity}).encode("utf-8"),
    )
    return json.loads(response["Payload"].read())


@tool
def get_order(order_id: str) -> dict:
    """Look up the status of an existing order by its order id."""
    response = client.invoke(
        FunctionName="order_status",
        InvocationType="RequestResponse",
        Payload=json.dumps({"order_id": order_id}).encode("utf-8"),
    )
    return json.loads(response["Payload"].read())

# =============================================================
# 2. MODEL
# =============================================================
model = ChatBedrockConverse(
    model="amazon.nova-pro-v1:0",
    region_name="us-east-1",
)

# =============================================================
# 3. STATE
# =============================================================
class State(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]
    intent: str        # "recommend" / "order" / "track"
    product_id: str    # used by order node
    quantity: int      # used by order node
    order_id: str      # used by tracking node

# =============================================================
# 4. NODES
# =============================================================

# --- Orchestrator (AGENT: uses model to decide intent) ---
def orchestrator(state: State) -> dict:
    response = model.invoke(
        [SystemMessage(content=(
            "You are the Orchestrator. Respond with ONLY this JSON:\n"
            '{"intent": "recommend|order|track", "order_id": "...", "product_id": "...", "quantity": 1}\n'
            "Rules for choosing intent:\n"
            "- 'order': ONLY when the user explicitly asks to BUY/ORDER/PURCHASE AND provides a specific product_id. "
            "If they just mention a product name or category without a product_id, use 'recommend'.\n"
            "- 'track': when the user wants to check/track an order and provides an order_id.\n"
            "- 'recommend': for EVERYTHING else — browsing, asking about products, mentioning a category, "
            "asking for suggestions, or any ambiguous request.\n"
            "- order_id: the order id if tracking, else empty string\n"
            "- product_id: the product id if ordering, else empty string\n"
            "- quantity: the quantity if ordering, else 1\n"
            "When in doubt, ALWAYS choose 'recommend'."
        ))]
        + state["messages"]
    )

    # Parse JSON from model response
    parsed = json.loads(response.content)
    return {
        "messages": [response],
        "intent": parsed.get("intent", "recommend"),
        "order_id": parsed.get("order_id", ""),
        "product_id": parsed.get("product_id", ""),
        "quantity": parsed.get("quantity", 1),
    }  

# --- Router (conditional edge) ---
def route_to_worker(state: State) -> str:
    intent = state.get("intent", "recommend")
    if intent == "track":
        return "order_tracking_node"
    elif intent == "order":
        return "order_management_node"
    return "recommendation_agent"

# --- Recommendation Agent (AGENT: ReAct loop with model + tool) ---
recommendation_agent = create_agent(
    model=model,
    tools=[recommend_products],
    system_prompt="You are AnyCart's product assistant. Use the recommend_products tool for product questions. "
           "Recommend only products supported by retrieved catalog text. If retrieval does not provide the requested detail, say you could not verify it. "
           "When presenting recommendations, format each product on its own line as a bullet list:\n"
           "- **Product Name** (product_id: XX) - $price\n"
           "  Description text here\n\n"
           "Use the EXACT product_id values returned by the tool. Do NOT make up IDs."
)

# --- Order Management (PURE NODE: no model, just calls Lambda) ---
def order_management_node(state: State) -> dict:
    product_id = state.get("product_id", "")
    quantity = state.get("quantity", 1)
    result = place_order.invoke({"product_id": product_id, "quantity": quantity})
    return {"messages": [AIMessage(content=f"Order placed! Details: {result}")]}


# --- Order Tracking (PURE NODE: no model, just calls Lambda) ---
def order_tracking_node(state: State) -> dict:
    order_id = state.get("order_id", "unknown")
    result = get_order.invoke({"order_id": order_id})
    return {"messages": [AIMessage(content=f"Order {order_id} status: {result}")]}

# =============================================================
# 5. GRAPH
# =============================================================
builder = StateGraph(State)

builder.add_node("orchestrator", orchestrator)
builder.add_node("recommendation_agent", recommendation_agent)
builder.add_node("order_management_node", order_management_node)
builder.add_node("order_tracking_node", order_tracking_node)

builder.add_edge(START, "orchestrator")
builder.add_conditional_edges("orchestrator", route_to_worker)
builder.add_edge("recommendation_agent", END)
builder.add_edge("order_management_node", END)
builder.add_edge("order_tracking_node", END)

# =============================================================
# 6. COMPILE
# =============================================================
graph = builder.compile()

# =============================================================
# 7: Entry points for AWS Lambda and the FastAPI service
# =============================================================
def handle_message(user_message: str) -> dict:
    """Run one shopping request through the agent graph."""
    if not user_message or not user_message.strip():
        return {"error": "No message provided"}

    result = graph.invoke(
        {"messages": [{"role": "user", "content": user_message.strip()}]}
    )
    response_text = result["messages"][-1].content
    if isinstance(response_text, list):
        response_text = "\n".join(
            block.get("text", "") if isinstance(block, dict) else str(block)
            for block in response_text
        ).strip()
    return {"response": response_text}


def lambda_handler(event, context):
    """
    AWS Lambda entry point (direct invocation only, no API Gateway).
    
     Expected event format:
    {
      "message": "Can you recommend me some shoes?"
    }

    """
    return handle_message(event.get("message", ""))


# =============================================================
# #8 LOCAL TESTING
# =============================================================
if __name__ == "__main__":
    test_event = {"message": "Can you track order_id 1d4d99c4-08c6-4fda-a687-48d1311a947f?"}
    result = lambda_handler(test_event, None)
    print(result["response"])


