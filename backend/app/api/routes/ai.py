from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.analytics import SummarizeRequest, ChatRequest
from app.services import ai_service
from app.services.project_service import get_project

router = APIRouter()


@router.post("/projects/{project_id}/ai/summarize")
async def summarize(
    project_id: str,
    data: SummarizeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    summary = await ai_service.summarize_mentions(
        db, project_id,
        mention_ids=data.mention_ids,
        date_from=data.date_from,
        date_to=data.date_to,
    )
    return {"summary": summary}


@router.post("/projects/{project_id}/ai/chat")
async def chat(
    project_id: str,
    data: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    response = await ai_service.chat_with_assistant(
        db, project_id, current_user.id, data.message, data.chat_id
    )
    return response
