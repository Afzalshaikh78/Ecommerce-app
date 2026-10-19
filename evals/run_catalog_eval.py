"""Offline integrity check for PDF-derived storefront product records."""
from ui.catalog import PRODUCTS
from evals.metrics import catalog_quality


def main():
    result = catalog_quality(PRODUCTS)
    print(f"Catalog records: {result['products']}")
    print(f"Required-field coverage: {result['valid_rate']:.1%} ({result['valid_records']}/{result['products']})")
    print(f"Unique product IDs: {result['unique_ids']}/{result['products']}")
    if result["valid_rate"] != 1 or result["unique_ids"] != result["products"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
