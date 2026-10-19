import unittest
from unittest.mock import Mock

from evals.metrics import PRODUCT_ID, catalog_quality, rank_relevant_chunk, summarize_chat_runs, summarize_ranks
from graph import KNOWLEDGE_BASE_ID, retrieve_context
from ui.catalog import PRODUCTS


class RetrievalTests(unittest.TestCase):
    def test_retrieve_uses_configured_knowledge_base_and_top_eight(self):
        fake = Mock()
        fake.retrieve.return_value = {"retrievalResults": [{"content": {"text": "05 Cloud Runner Running Shoes"}, "location": {"s3Location": {"uri": "s3://catalog.pdf"}}}]}
        result = retrieve_context("running shoes", client_override=fake)
        fake.retrieve.assert_called_once_with(
            knowledgeBaseId=KNOWLEDGE_BASE_ID,
            retrievalQuery={"text": "running shoes"},
            retrievalConfiguration={"vectorSearchConfiguration": {"numberOfResults": 8}},
        )
        self.assertEqual(result[0]["text"], "05 Cloud Runner Running Shoes")
        self.assertEqual(result[0]["source"]["s3Location"]["uri"], "s3://catalog.pdf")

    def test_metrics_measure_relevant_rank_and_aggregate(self):
        chunks = [{"text": "01 Cotton T-Shirt"}, {"text": "05 Cloud Runner Running Shoes"}]
        self.assertEqual(rank_relevant_chunk(chunks, {"05"}), 2)
        self.assertIsNone(rank_relevant_chunk(chunks, {"12"}))
        self.assertEqual(summarize_ranks([1, 2, None]), {"queries": 3, "recall": 2 / 3, "mrr": 0.5})

    def test_product_id_matcher_accepts_agent_format(self):
        self.assertEqual(PRODUCT_ID.findall("- **Cloud Runner** (product_id: 05) - $89.99"), ["05"])
        self.assertEqual(PRODUCT_ID.findall("Product ID: 11"), ["11"])

    def test_chat_metrics_report_success_grounding_and_tail_latency(self):
        runs = [
            {"success": True, "grounded": True, "latency_ms": 100},
            {"success": True, "grounded": False, "latency_ms": 200},
            {"success": False, "grounded": False, "latency_ms": 300},
        ]
        metrics = summarize_chat_runs(runs)
        self.assertEqual(metrics["success_rate"], 2 / 3)
        self.assertEqual(metrics["grounded_rate"], 0.5)
        self.assertEqual(metrics["average_latency_ms"], 200)
        self.assertEqual(metrics["p95_latency_ms"], 300)

    def test_catalog_quality_checks_required_fields_and_unique_ids(self):
        metrics = catalog_quality(PRODUCTS)
        self.assertEqual(metrics["products"], 12)
        self.assertEqual(metrics["valid_rate"], 1)
        self.assertEqual(metrics["unique_ids"], 12)


if __name__ == "__main__":
    unittest.main()
