"""Measure end-to-end latency on the live FastAPI backend.

Hits a representative read endpoint many times and reports p50/p95.
Uses the seeded admin account; if it doesn't exist we degrade to
unauthenticated endpoints (still gives a useful baseline).
"""
import json
import os
import statistics
import sys
import time
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:8000"
EMAIL = "admin@sentinews.kz"
PASSWORD = "admin123"
N_REQUESTS = 20

# Larger projects owned by admin@sentinews.kz, so the seeded creds can read them.
PROJECT_IDS = [
    ("Ronaldo", "f538a818-a925-40a0-b42f-90e32d463fc6"),     # 637 mentions
    ("Adidas",  "000e203e-2db6-45bf-b467-9ab5a92695dd"),     # 582 mentions
    ("Kazakh",  "99c12d77-58a8-4275-a669-747e2207b0ac"),     # 410 mentions
]


def _post(url: str, body: dict, token: str | None = None) -> dict:
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())


def _get_timed(url: str, token: str | None = None) -> tuple[int, float]:
    req = urllib.request.Request(url, method="GET")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            r.read()
            return r.status, time.perf_counter() - t0
    except urllib.error.HTTPError as e:
        return e.code, time.perf_counter() - t0


def percentile(xs: list[float], p: float) -> float:
    xs = sorted(xs)
    if not xs:
        return float("nan")
    k = max(0, min(len(xs) - 1, int(round((p / 100.0) * (len(xs) - 1)))))
    return xs[k]


def measure(name: str, url: str, token: str | None, n: int = N_REQUESTS) -> dict:
    statuses, durs = [], []
    # Warmup — first request often pays for connection / DB pool setup.
    _get_timed(url, token)
    for _ in range(n):
        s, d = _get_timed(url, token)
        statuses.append(s)
        durs.append(d * 1000.0)  # ms
    return {
        "endpoint": name,
        "url": url,
        "n": n,
        "ok_count": sum(1 for s in statuses if 200 <= s < 300),
        "min_ms": round(min(durs), 1),
        "p50_ms": round(percentile(durs, 50), 1),
        "p95_ms": round(percentile(durs, 95), 1),
        "max_ms": round(max(durs), 1),
        "mean_ms": round(statistics.mean(durs), 1),
        "samples_ms": [round(d, 1) for d in durs],
    }


def main() -> None:
    token = None
    try:
        login = _post(f"{BASE}/api/v1/auth/login", {"email": EMAIL, "password": PASSWORD})
        token = login.get("access_token") or login.get("accessToken") or login.get("token")
        print(f"login OK, token={'present' if token else 'missing'}", file=sys.stderr)
    except Exception as e:
        print(f"login failed ({e}); will measure unauthenticated endpoints only", file=sys.stderr)

    results = [
        measure("openapi.json (no auth)", f"{BASE}/openapi.json", None),
    ]
    if token:
        for label, pid in PROJECT_IDS:
            results.append(measure(
                f"GET /projects/{label}/mentions?per_page=25",
                f"{BASE}/api/v1/projects/{pid}/mentions?page=1&per_page=25",
                token,
            ))
            results.append(measure(
                f"GET /projects/{label}/mentions/stats",
                f"{BASE}/api/v1/projects/{pid}/mentions/stats",
                token,
            ))
            results.append(measure(
                f"GET /projects/{label}/analytics/time-series",
                f"{BASE}/api/v1/projects/{pid}/analytics/time-series?days=30",
                token,
            ))

    os.makedirs("eval_out", exist_ok=True)
    with open("eval_out/latency.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    sys.stdout = open(1, "w", encoding="utf-8", closefd=False)
    print(json.dumps([{k: v for k, v in r.items() if k != "samples_ms"} for r in results],
                     indent=2, ensure_ascii=False))
    print("\nFull samples saved to eval_out/latency.json")


if __name__ == "__main__":
    main()
