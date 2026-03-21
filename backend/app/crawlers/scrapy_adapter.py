from __future__ import annotations

# Integration point for Scrapy-based bulk crawl workers.
# The runtime deployment can invoke an external Scrapy project and feed discovered URLs to Kafka.


def scrapy_bulk_crawl_hint() -> dict:
    return {
        "engine": "scrapy",
        "mode": "bulk_html",
        "note": "Use Scrapy spiders for high-volume crawl and push URL batches to Kafka.",
    }

