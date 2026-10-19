"""Live Knowledge Base retrieval evaluation. Each case makes one Retrieve call."""
import json
from pathlib import Path

from graph import retrieve_context
from evals.metrics import rank_relevant_chunk, summarize_ranks


def main():
    cases = json.loads((Path(__file__).parent / "rag_cases.json").read_text(encoding="utf-8"))
    ranks = []
    for case in cases:
        chunks = retrieve_context(case["query"])
        rank = rank_relevant_chunk(chunks, set(case["expected_product_ids"]))
        ranks.append(rank)
        print(f"{'HIT @ ' + str(rank) if rank else 'MISS':8} | {case['query']}")
    scores = summarize_ranks(ranks)
    print(f"Recall@8: {scores['recall']:.0%} ({sum(rank is not None for rank in ranks)}/{scores['queries']})")
    print(f"MRR:      {scores['mrr']:.3f}")
    if scores["recall"] < 0.8:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
