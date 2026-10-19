import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from graph import handle_message
from ui.catalog import FEATURED_PRODUCTS, PRODUCTS, all_categories

app = FastAPI(title="AnyCart API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/catalog")
def catalog():
    return {
        "products": PRODUCTS,
        "featured": FEATURED_PRODUCTS,
        "categories": all_categories(),
    }


@app.post("/api/chat")
def chat(request: ChatRequest):
    try:
        result = handle_message(request.message)
    except Exception as exc:
        raise HTTPException(status_code=502, detail="The shopping assistant is temporarily unavailable.") from exc
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result
