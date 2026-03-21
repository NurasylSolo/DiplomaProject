from app.eval.run_offline_eval import run


def test_offline_eval_smoke():
    result = run("app/eval/gold_dataset_sample.json")
    assert "sentiment_metrics" in result
    assert result["samples"] >= 3

