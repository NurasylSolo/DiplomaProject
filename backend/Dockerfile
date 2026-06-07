# ---------------------------------------------------------------------------
# Senti News backend (FastAPI) — production image
# ---------------------------------------------------------------------------
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Build tools needed by a few wheels (asyncpg, bcrypt, Pillow, reportlab).
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps first so this layer is cached across code changes.
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# App source.
COPY . .

# Platforms (Render/Railway) inject $PORT; default to 8000 locally.
ENV PORT=8000
EXPOSE 8000

# Container-level healthcheck hits the FastAPI /health endpoint.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -fsS "http://127.0.0.1:${PORT:-8000}/health" || exit 1

# Apply DB migrations, then serve. `sh -c` so ${PORT} is expanded at runtime.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
