from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.source_catalog import (
    AttachCatalogSourcesRequest,
    AttachCatalogSourcesResponse,
    SourceCatalogImportRequest,
    SourceCatalogImportResponse,
)
from app.services import source_catalog_service, source_service
from app.services.project_service import get_project

router = APIRouter()


@router.post("/source-catalog/import", response_model=SourceCatalogImportResponse)
async def import_source_catalog(
    payload: SourceCatalogImportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    result = await source_catalog_service.import_source_catalog(
        db=db,
        items=[item.model_dump() for item in payload.items],
        csv_payload=payload.csv_payload,
    )
    return result


@router.get("/source-catalog/health")
async def list_source_catalog_health(
    limit: int = Query(default=200, ge=1, le=2000),
    active: bool | None = None,
    language: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return await source_catalog_service.list_catalog_health(
        db=db,
        limit=limit,
        active=active,
        language=language,
    )


@router.get("/source-catalog/health/{domain}")
async def get_source_catalog_health(
    domain: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    result = await source_catalog_service.get_catalog_health_by_domain(db, domain)
    if not result:
        return {"message": "Domain not found"}
    return result


@router.get("/source-catalog/status/summary")
async def source_catalog_status_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    return await source_catalog_service.source_health_summary(db)


@router.post(
    "/projects/{project_id}/source-catalog/attach",
    response_model=AttachCatalogSourcesResponse,
)
async def attach_catalog_sources_to_project(
    project_id: str,
    payload: AttachCatalogSourcesRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    result = await source_service.attach_catalog_sources_to_project(
        db=db,
        project_id=project_id,
        filters=payload.model_dump(),
    )
    return result

