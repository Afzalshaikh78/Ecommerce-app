"""Opt-in live assistant benchmark; each case can invoke Bedrock and the KB."""
import argparse
import json
import time
from datetime import datetime, timezone
from pathlib import Path

from graph import handle_message
from evals.metrics import PRODUCT_ID, summarize_chat_runs


def run_case(case):
    started = time.perf_counter()
    try:
        result = handle_message(case["query"])
        answer = result.get("response", "")
        success = bool(answer.strip()) and "error" not in result
        ids = set(PRODUCT_ID.findall(answer))
        grounded = bool(ids.intersection(case["expected_product_ids"]))
        error = None
    except Exception as exc:
        answer, success, grounded, error = "", False, False, f"{type(exc).__name__}: {exc}"
    return {
        "query": case["query"],
        "expected_product_ids": case["expected_product_ids"],
        "success": success,
        "grounded": grounded,
        "latency_ms": round((time.perf_counter() - started) * 1000, 1),
        "answer": answer,
        "error": error,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--all", action="store_true", help="Run all 24 cases; default runs a 4-case smoke sample")
    parser.add_argument("--output", help="Write detailed JSON results to this path")
    args = parser.parse_args()

    cases = json.loads((Path(__file__).parent / "chat_cases.json").read_text(encoding="utf-8"))
    if not args.all:
        cases = cases[:4]
    runs = [run_case(case) for case in cases]
    metrics = summarize_chat_runs(runs)
    for run in runs:
        state = "OK" if run["success"] else "ERROR"
        grounding = "grounded" if run["grounded"] else "ungrounded"
        print(f"{state:5} {grounding:11} {run['latency_ms']:8.1f} ms | {run['query']}")
        if run["error"]:
            print(f"      {run['error']}")
    print(f"Requests:       {metrics['requests']}")
    print(f"Chat success:   {metrics['success_rate']:.1%}")
    print(f"Product grounded: {metrics['grounded_rate']:.1%} of successful replies")
    print(f"Avg latency:    {metrics['average_latency_ms']:.1f} ms")
    print(f"P95 latency:    {metrics['p95_latency_ms']:.1f} ms")

    report = {
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "metrics": metrics,
        "runs": runs,
    }
    if args.output:
        target = Path(args.output)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"Report saved:   {target}")
    if metrics["success_rate"] < 0.9 or metrics["grounded_rate"] < 0.8:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
