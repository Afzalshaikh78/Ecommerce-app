# AnyCart

AnyCart is a JavaScript React + Tailwind storefront backed by FastAPI. Product cards use normalized records extracted from `data/product_catalog.pdf` and stored in `data/products.json`; recommendations retrieve relevant PDF chunks from the Amazon Bedrock Knowledge Base through LangGraph. Order placement and tracking use the existing AWS Lambda tools.

## Local development

Prerequisites: Python 3.12+, Node.js 20+, AWS credentials with Bedrock Knowledge Base `Retrieve` and Lambda invoke access in `us-east-1`.

```powershell
uv sync
uv run uvicorn api:app --reload
```

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal. During development, Vite forwards `/api` requests to FastAPI at `http://127.0.0.1:8000`. For a separately hosted API, set `VITE_API_URL` to its base URL when building the frontend and set `CORS_ORIGINS` on the API to comma-separated allowed origins.

The Knowledge Base ID defaults to `JV19IHUE3C`. Override it with `BEDROCK_KNOWLEDGE_BASE_ID` if needed. If the catalog changes, regenerate `data/products.json` from the source PDF and resync the PDF in the Knowledge Base for RAG recommendations.

## API

- `GET /api/health` — health check
- `GET /api/catalog` — catalog, featured products, and categories
- `POST /api/chat` — `{ "message": "..." }`, returns `{ "response": "..." }`

## Tests and RAG evaluation

Run the offline unit suite (no AWS calls):

```powershell
uv run python -m unittest discover -s tests -v
```

Run the live retrieval evaluation with AWS credentials and Knowledge Base access configured:

```powershell
uv run python -m evals.run_rag_eval
```

The live evaluation uses five labeled product queries and reports Recall@8 and MRR. It fails when Recall@8 is below 80%; each case makes one Bedrock Knowledge Base retrieval call. The unit tests verify catalog integrity, retrieval request configuration, and ranking metrics without calling AWS.

Run an offline catalog-quality report (no AWS calls):

```powershell
uv run python -m evals.run_catalog_eval
```

Run the end-to-end assistant benchmark. The default is a 4-query smoke run; use `--all` for all 24 recommendation prompts. Save raw measurements for repeatability with `--output`:

```powershell
uv run python -m evals.run_chat_eval --all --output evals/results/chat.json
```

It reports request success rate, whether each answer includes the expected product ID, average latency, and nearest-rank P95 latency. This live benchmark invokes the orchestrator and recommendation agent and may generate multiple billable Bedrock calls per prompt. Latency reflects the machine/network running the evaluator; deploy and rerun it from a representative host before claiming production latency. Report measured values with the evaluation size, for example: “24-query evaluation: X% request success, Y% expected-ID grounding, Z ms average / W ms P95.”

## Deploying the API

For a container service such as App Runner or ECS, run `uvicorn api:app --host 0.0.0.0 --port 8000` and grant the task role Bedrock model access, `bedrock:Retrieve` on the Knowledge Base, and permission to invoke the order and tracking Lambdas. Keep AWS credentials in the runtime role, not in the frontend.

The root Dockerfile runs the FastAPI app and can be used for Render web services. To deploy the agent directly as an AWS Lambda container, use `Dockerfile.lambda`.
