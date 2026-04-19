from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectStatsResponse
from app.schemas.auth import MessageResponse
from app.services import project_service, ingestion_service, embedding_service
from app.tasks.dispatcher import enqueue_refresh_project_mentions

router = APIRouter()


@router.get("")
async def list_projects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    results = await project_service.get_user_projects(db, current_user.id)
    projects = []
    for r in results:
        p = r["project"]
        raw_stats = r["stats"]
        projects.append({
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "logo": p.logo,
            "accentColor": p.accent_color,
            "ownerId": p.owner_id,
            "settings": p.settings,
            "createdAt": p.created_at.isoformat() if p.created_at else "",
            "updatedAt": p.updated_at.isoformat() if p.updated_at else "",
            "stats": {
                "totalMentions": raw_stats["total_mentions"],
                "totalReach": raw_stats["total_reach"],
                "positivePercentage": raw_stats["positive_percentage"],
                "negativePercentage": raw_stats["negative_percentage"],
                "presenceScore": raw_stats["presence_score"],
            } if raw_stats else None,
        })
    return projects


@router.post("")
async def create_project(
    data: ProjectCreate,
    auto_start_ingestion: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await project_service.create_project(
        db, current_user.id, data.model_dump(exclude_unset=True)
    )
    queue_task_id = None
    ingestion_job_id = None
    if auto_start_ingestion:
        await db.commit()
        job = await ingestion_service.create_crawl_job(
            db=db,
            project_id=project.id,
            source_id=None,
            created_by=current_user.id,
            job_type="refresh_project_mentions",
            status="pending",
        )
        ingestion_job_id = job.id
        await db.commit()
        queue_task_id = enqueue_refresh_project_mentions(
            project_id=project.id,
            crawl_job_id=job.id,
            created_by=current_user.id,
        )
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "logo": project.logo,
        "accentColor": project.accent_color,
        "ownerId": project.owner_id,
        "settings": project.settings,
        "createdAt": project.created_at.isoformat() if project.created_at else "",
        "updatedAt": project.updated_at.isoformat() if project.updated_at else "",
        "ingestionTaskId": queue_task_id,
        "ingestionJobId": ingestion_job_id,
    }


@router.get("/{project_id}")
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await project_service.get_project(db, project_id, current_user.id)
    raw_stats = project_service._stats_from_settings(project.settings)
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "logo": project.logo,
        "accentColor": project.accent_color,
        "ownerId": project.owner_id,
        "settings": project.settings,
        "createdAt": project.created_at.isoformat() if project.created_at else "",
        "updatedAt": project.updated_at.isoformat() if project.updated_at else "",
        "stats": {
            "totalMentions": raw_stats["total_mentions"],
            "totalReach": raw_stats["total_reach"],
            "positivePercentage": raw_stats["positive_percentage"],
            "negativePercentage": raw_stats["negative_percentage"],
            "presenceScore": raw_stats["presence_score"],
        } if raw_stats else None,
    }


@router.put("/{project_id}")
async def update_project(
    project_id: str,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await project_service.update_project(
        db, project_id, current_user.id, data.model_dump(exclude_unset=True)
    )
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "logo": project.logo,
        "accentColor": project.accent_color,
        "ownerId": project.owner_id,
        "settings": project.settings,
        "createdAt": project.created_at.isoformat() if project.created_at else "",
        "updatedAt": project.updated_at.isoformat() if project.updated_at else "",
    }


@router.delete("/{project_id}", response_model=MessageResponse)
async def delete_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await project_service.delete_project(db, project_id, current_user.id)
    return {"message": "Project deleted successfully"}


@router.post("/{project_id}/embeddings/backfill")
async def backfill_embeddings(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Compute OpenAI embeddings for every mention of the project that doesn't
    have one yet. Used by the AI Assistant / Insights / Topic AI features
    to enable RAG retrieval over the full corpus.
    """
    # Verify ownership via the service helper (the local `get_project` here
    # is a route handler, not the service function).
    await project_service.get_project(db, project_id, current_user.id)
    return await embedding_service.backfill_project(db, project_id)


@router.post("/{project_id}/refresh")
async def refresh_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually trigger a fresh ingestion run for the project.

    Creates a `refresh_project_mentions` crawl job and dispatches it to the
    task queue (Kafka or local), so the UI can poll progress just like
    after project creation.
    """
    # Ensures the user actually owns the project (raises 404 otherwise).
    await project_service.get_project(db, project_id, current_user.id)

    job = await ingestion_service.create_crawl_job(
        db=db,
        project_id=project_id,
        source_id=None,
        created_by=current_user.id,
        job_type="refresh_project_mentions",
        status="pending",
    )
    await db.commit()
    queue_task_id = enqueue_refresh_project_mentions(
        project_id=project_id,
        crawl_job_id=job.id,
        created_by=current_user.id,
    )
    return {
        "ingestionTaskId": queue_task_id,
        "ingestionJobId": job.id,
        "status": "pending",
    }


@router.delete("/cleanup/previous", response_model=MessageResponse)
async def delete_previous_projects(
    keep_project_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    removed = await project_service.delete_previous_projects(
        db=db,
        user_id=current_user.id,
        keep_project_id=keep_project_id,
    )
    return {"message": f"Deleted {removed} previous projects"}
