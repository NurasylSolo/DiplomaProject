from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    OPENAI_API_KEY: str = ""
    OPENAI_CHAT_MODEL: str = "gpt-4o"

    NEWS_API_KEY: str = ""
    NEWS_API_PAGE_SIZE: int = 100

    SERP_API_KEY: str = ""
    NEWSDATA_API_KEY: str = ""

    CORS_ORIGINS: str = "http://localhost:3000"

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@sentinews.kz"

    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"
    CELERY_TASK_ALWAYS_EAGER: bool = False
    TASK_QUEUE_MODE: str = "kafka"
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_TASKS_TOPIC: str = "senti.tasks"
    KAFKA_SYNC_TOPIC: str = "senti.sync"
    KAFKA_CONSUMER_GROUP: str = "senti-workers"
    KAFKA_AUTO_OFFSET_RESET: str = "earliest"

    SCHEDULER_ENABLED: bool = True
    SCHEDULER_REFRESH_INTERVAL_MINUTES: int = 30
    INGESTION_MAX_RETRIES: int = 3
    INGESTION_BACKOFF_SECONDS: int = 2
    INGESTION_RATE_LIMIT_PER_SOURCE_PER_MINUTE: int = 60
    INGESTION_LOCK_TTL_SECONDS: int = 900

    ENABLE_OPENSEARCH_SYNC: bool = False
    OPENSEARCH_URL: str = "http://localhost:9200"
    OPENSEARCH_MENTIONS_INDEX: str = "mentions"

    ENABLE_CLICKHOUSE: bool = False
    CLICKHOUSE_DSN: str = ""

    ENABLE_RAG_EMBEDDINGS: bool = False
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"

    ALERT_WEBHOOK_TIMEOUT_SECONDS: int = 10
    ENABLE_SLACK_ALERTS: bool = False
    SLACK_BOT_TOKEN: str = ""
    SLACK_CHANNEL: str = ""
    SENTRY_DSN: str = ""

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
