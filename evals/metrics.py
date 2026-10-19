import re
import math


PRODUCT_ID = re.compile(r"(?im)(?:^|\bproduct[_\s]*id\s*[:#]?\s*)(\d{2})(?=\s|\b)")


def rank_relevant_chunk(chunks: list[dict], expected_ids: set[str]) -> int | None:
    for rank, chunk in enumerate(chunks, start=1):
        text = chunk.get("text", "")
        if expected_ids.intersection(PRODUCT_ID.findall(text)):
            return rank
    return None


def summarize_ranks(ranks: list[int | None]) -> dict:
    total = len(ranks)
    if not total:
        return {"queries": 0, "recall": 0.0, "mrr": 0.0}
    hits = [rank for rank in ranks if rank is not None]
    return {
        "queries": total,
        "recall": len(hits) / total,
        "mrr": sum(1 / rank for rank in hits) / total,
    }


def summarize_chat_runs(runs: list[dict]) -> dict:
    total = len(runs)
    successful = [run for run in runs if run["success"]]
    latencies = sorted(run["latency_ms"] for run in runs)
    grounded = sum(run["grounded"] for run in successful)
    return {
        "requests": total,
        "success_rate": len(successful) / total if total else 0.0,
        "grounded_rate": grounded / len(successful) if successful else 0.0,
        "average_latency_ms": sum(latencies) / total if total else 0.0,
        "p95_latency_ms": latencies[max(0, math.ceil(0.95 * total) - 1)] if total else 0.0,
    }


def catalog_quality(products: list[dict]) -> dict:
    required = {"product_id", "name", "category", "price", "description", "inventory"}
    valid = [product for product in products if required.issubset(product) and all(product[key] not in (None, "") for key in required)]
    ids = [product.get("product_id") for product in products]
    return {
        "products": len(products),
        "valid_records": len(valid),
        "valid_rate": len(valid) / len(products) if products else 0.0,
        "unique_ids": len(set(ids)),
    }
