from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.raw_document import RawDocument


@dataclass
class ClusterDecision:
    cluster_id: str
    cluster_size: int
    primary_doc: bool
    simhash: str


def _tokens(text: str) -> list[str]:
    return re.findall(r"[a-zа-яәіңғүұқөһ0-9]{3,}", (text or "").lower())


def simhash64(text: str) -> str:
    vec = [0] * 64
    for tok in _tokens(text):
        hv = int(hashlib.sha1(tok.encode("utf-8")).hexdigest()[:16], 16)
        for i in range(64):
            bit = 1 if (hv >> i) & 1 else -1
            vec[i] += bit
    out = 0
    for i, score in enumerate(vec):
        if score >= 0:
            out |= (1 << i)
    return f"{out:016x}"


def hamming_hex(a_hex: str, b_hex: str) -> int:
    if not a_hex or not b_hex:
        return 64
    a = int(a_hex, 16)
    b = int(b_hex, 16)
    return (a ^ b).bit_count()


async def assign_cluster(
    db: AsyncSession,
    project_id: str,
    normalized_text: str,
    url_hash: str,
    title_hash: str | None,
    text_hash: str | None,
    threshold: int = 6,
) -> ClusterDecision:
    sim = simhash64(normalized_text or "")

    # Exact duplicate family key first.
    exact_key = f"{url_hash}:{title_hash or ''}:{text_hash or ''}"
    cluster_id = hashlib.sha1(exact_key.encode("utf-8")).hexdigest()[:32]

    # Try near-duplicate with recent docs from same project.
    candidates = (
        await db.execute(
            select(RawDocument)
            .where(RawDocument.project_id == project_id, RawDocument.simhash.isnot(None))
            .order_by(RawDocument.created_at.desc())
            .limit(300)
        )
    ).scalars().all()

    matched: RawDocument | None = None
    for doc in candidates:
        if not doc.simhash:
            continue
        if hamming_hex(sim, doc.simhash) <= threshold:
            matched = doc
            break

    if matched and matched.cluster_id:
        cluster_id = matched.cluster_id
        cluster_size = (
            await db.execute(
                select(RawDocument).where(
                    RawDocument.project_id == project_id,
                    RawDocument.cluster_id == cluster_id,
                )
            )
        ).scalars().all()
        size = len(cluster_size) + 1
        return ClusterDecision(
            cluster_id=cluster_id,
            cluster_size=size,
            primary_doc=False,
            simhash=sim,
        )

    return ClusterDecision(
        cluster_id=cluster_id,
        cluster_size=1,
        primary_doc=True,
        simhash=sim,
    )

