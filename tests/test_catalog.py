import unittest

from ui.catalog import PRODUCTS, all_categories


class CatalogTests(unittest.TestCase):
    def test_pdf_catalog_has_all_products_and_unique_ids(self):
        self.assertEqual(len(PRODUCTS), 12)
        self.assertEqual(len({product["product_id"] for product in PRODUCTS}), 12)

    def test_product_records_have_required_storefront_fields(self):
        for product in PRODUCTS:
            with self.subTest(product=product["product_id"]):
                self.assertTrue(product["name"])
                self.assertIn(product["category"], {"Clothing", "Shoes", "Accessories"})
                self.assertGreater(product["price"], 0)
                self.assertGreaterEqual(product["inventory"], 0)
                self.assertTrue(product["description"])

    def test_categories_are_derived_from_catalog(self):
        self.assertEqual(all_categories(), ["Accessories", "Clothing", "Shoes"])


if __name__ == "__main__":
    unittest.main()
