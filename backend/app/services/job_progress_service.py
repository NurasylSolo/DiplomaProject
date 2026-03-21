from __future__ import annotations

from datetime import datetime, timezone, timedelta
from threading import Lock


_LOCK = Lock()
_TTL = timedelta(hours=6)
_PROGRESS: dict[str, dict] = {}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _cleanup() -> None:
    now = _utcnow()
    expired = [job_id for job_id, payload in _PROGRESS.items() if (now - payload["updated_at"]) > _TTL]
    for job_id in expired:
        _PROGRESS.pop(job_id, None)


def start_job(job_id: str, total_sources: int) -> None:
    with _LOCK:
        _cleanup()
        _PROGRESS[job_id] = {
            "total_sources": max(0, int(total_sources)),
            "processed_sources": 0,
            "status": "running",
            "error": None,
            "updated_at": _utcnow(),
        }


def advance_job(job_id: str, delta: int = 1) -> None:
    with _LOCK:
        payload = _PROGRESS.get(job_id)
        if not payload:
            return
        payload["processed_sources"] = max(0, int(payload["processed_sources"]) + int(delta))
        payload["updated_at"] = _utcnow()


def finish_job(job_id: str, *, failed: bool = False, error: str | None = None) -> None:
    with _LOCK:
        payload = _PROGRESS.get(job_id)
        if not payload:
            return
        payload["status"] = "failed" if failed else "completed"
        if failed:
            payload["error"] = (error or "")[:2000] or None
        else:
            payload["processed_sources"] = max(
                int(payload["processed_sources"]),
                int(payload["total_sources"]),
            )
            payload["error"] = None
        payload["updated_at"] = _utcnow()


def get_job_progress(job_id: str) -> dict | None:
    with _LOCK:
        payload = _PROGRESS.get(job_id)
        if not payload:
            return None
        total = int(payload["total_sources"])
        processed = int(payload["processed_sources"])
        if payload["status"] == "completed":
            percent = 100
        elif total <= 0:
            percent = 0
        else:
            percent = max(0, min(99, int((processed / total) * 100)))
        return {
            "total_sources": total,
            "processed_sources": processed,
            "progress_percent": percent,
            "status": payload["status"],
            "error": payload.get("error"),
        }
