"""Normalized product data extracted from data/product_catalog.pdf."""
import json
from pathlib import Path

PRODUCTS = json.loads((Path(__file__).resolve().parents[1] / "data" / "products.json").read_text(encoding="utf-8"))
FEATURED_PRODUCTS = PRODUCTS[:6]


def format_price(price: float) -> str:
    return f"${price:.2f}"


def all_categories() -> list[str]:
    return sorted({product["category"] for product in PRODUCTS})
