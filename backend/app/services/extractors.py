from __future__ import annotations

import re
from bs4 import BeautifulSoup


def extract_article_text(html: str) -> str:
    """
    Template-ish extraction first (article/main/content selectors),
    then fallback readability-like text collapse.
    """
    soup = BeautifulSoup(html or "", "html.parser")
    for tag in soup(["script", "style", "noscript", "svg", "iframe"]):
        tag.decompose()

    # Template strategy for common article containers.
    selectors = [
        "article",
        "main",
        "[role=main]",
        ".article",
        ".post",
        ".content",
        ".entry-content",
    ]
    blocks: list[str] = []
    for selector in selectors:
        for node in soup.select(selector):
            text = node.get_text(" ", strip=True)
            if len(text) >= 100:
                blocks.append(text)
        if blocks:
            break

    if not blocks:
        # Readability-like fallback: prioritize paragraphs.
        paragraphs = [p.get_text(" ", strip=True) for p in soup.find_all("p")]
        blocks = [p for p in paragraphs if len(p) >= 40]

    text = " ".join(blocks)
    text = re.sub(r"\s+", " ", text).strip()
    return text

