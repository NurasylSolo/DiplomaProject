from contextlib import asynccontextmanager
import time
from fastapi import FastAPI
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from fastapi.responses import JSONResponse
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
import sentry_sdk
from app.config import settings
from app.api.routes import api_router
from app.database import AsyncSessionLocal
from app.services import ingestion_service
from app.tasks.scheduler import build_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.SENTRY_DSN:
        sentry_sdk.init(dsn=settings.SENTRY_DSN, traces_sample_rate=0.1)
    scheduler = None
    if settings.SCHEDULER_ENABLED:
        scheduler = build_scheduler()
        scheduler.start()
    yield
    if scheduler:
        scheduler.shutdown(wait=False)


app = FastAPI(
    title="Senti News API",
    description="Media Intelligence Platform API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

http_requests_total = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "path", "status"],
)
http_request_duration_seconds = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration seconds",
    ["method", "path"],
)
_rate_limit_window_seconds = 60
_rate_limit_max_requests = 300
_rate_limit_bucket: dict[str, list[float]] = {}


@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    # Lightweight in-memory API rate limit per client IP.
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    slots = _rate_limit_bucket.setdefault(client_ip, [])
    slots[:] = [ts for ts in slots if now - ts <= _rate_limit_window_seconds]
    if len(slots) >= _rate_limit_max_requests:
        return JSONResponse({"detail": "Rate limit exceeded"}, status_code=429)
    slots.append(now)

    start = time.perf_counter()
    response = await call_next(request)
    duration = max(0.0, time.perf_counter() - start)
    path = request.url.path
    http_requests_total.labels(request.method, path, str(response.status_code)).inc()
    http_request_duration_seconds.labels(request.method, path).observe(duration)
    return response


@app.get("/")
async def root():
    return {"message": "Senti News API", "version": "1.0.0", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/ops/metrics")
async def ops_metrics():
    async with AsyncSessionLocal() as db:
        ingestion = await ingestion_service.get_ingestion_health(db)
    return {"status": "ok", "ingestion": ingestion}


@app.get("/metrics")
async def metrics():
    return PlainTextResponse(generate_latest().decode("utf-8"), media_type=CONTENT_TYPE_LATEST)
