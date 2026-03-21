from __future__ import annotations


def playwright_js_crawl_hint() -> dict:
    return {
        "engine": "playwright",
        "mode": "js_heavy_fallback",
        "note": "Invoke Playwright only for sources marked JS-heavy or repeated extraction failures.",
    }

