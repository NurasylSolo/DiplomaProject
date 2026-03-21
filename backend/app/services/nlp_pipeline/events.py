from __future__ import annotations

from statistics import mean, pstdev


def detect_spike_drop_events(
    values: list[float],
    *,
    min_points: int = 8,
    z_threshold: float = 2.0,
) -> list[dict]:
    if len(values) < min_points:
        return []
    base = values[:-1]
    current = values[-1]
    mu = mean(base)
    sigma = pstdev(base) or 1e-9
    z = (current - mu) / sigma
    if z >= z_threshold:
        return [{"event": "spike", "z_score": round(z, 3), "current": current, "baseline": round(mu, 3)}]
    if z <= -z_threshold:
        return [{"event": "drop", "z_score": round(z, 3), "current": current, "baseline": round(mu, 3)}]
    return []

