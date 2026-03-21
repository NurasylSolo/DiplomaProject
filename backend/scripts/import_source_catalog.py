import argparse
import asyncio
import json
from pathlib import Path

from app.database import AsyncSessionLocal
from app.services import source_catalog_service


async def _run(file_path: str) -> None:
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Input file not found: {file_path}")

    content = path.read_text(encoding="utf-8")
    items = []
    csv_payload = None

    if path.suffix.lower() == ".json":
        payload = json.loads(content)
        if isinstance(payload, dict) and isinstance(payload.get("sources"), list):
            items = payload["sources"]
        elif isinstance(payload, list):
            items = payload
        else:
            raise ValueError("JSON must be a list of rows or object with 'sources' array")
    elif path.suffix.lower() == ".csv":
        csv_payload = content
    else:
        raise ValueError("Unsupported file extension. Use .json or .csv")

    async with AsyncSessionLocal() as db:
        result = await source_catalog_service.import_source_catalog(
            db=db,
            items=items,
            csv_payload=csv_payload,
        )
        await db.commit()
    print(json.dumps(result, ensure_ascii=False, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser(description="Batch import source catalog from JSON/CSV")
    parser.add_argument("--file", required=True, help="Path to JSON or CSV file with source rows")
    args = parser.parse_args()
    asyncio.run(_run(args.file))


if __name__ == "__main__":
    main()

