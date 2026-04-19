from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.analytics import (
    AIReportRequest,
    ChatRequest,
    RenameChatRequest,
    SummarizeRequest,
)
from app.schemas.auth import MessageResponse
from app.services import ai_service, mention_service
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


# ─── Chat history ─────────────────────────────────────────────────────────


@router.get("/projects/{project_id}/ai/chats")
async def list_chats(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    return await ai_service.list_chats(db, project_id, current_user.id)


@router.get("/projects/{project_id}/ai/chats/{chat_id}/messages")
async def get_chat_messages(
    project_id: str,
    chat_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    return await ai_service.get_chat_messages(db, project_id, chat_id, current_user.id)


@router.delete(
    "/projects/{project_id}/ai/chats/{chat_id}",
    response_model=MessageResponse,
)
async def delete_chat(
    project_id: str,
    chat_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    await ai_service.delete_chat(db, project_id, chat_id, current_user.id)
    return {"message": "Chat deleted"}


@router.patch("/projects/{project_id}/ai/chats/{chat_id}")
async def rename_chat(
    project_id: str,
    chat_id: str,
    data: RenameChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await get_project(db, project_id, current_user.id)
    return await ai_service.rename_chat(
        db, project_id, chat_id, current_user.id, data.title
    )


# ─── AI structured report ────────────────────────────────────────────────


@router.post("/projects/{project_id}/ai/report")
async def ai_report(
    project_id: str,
    data: AIReportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = await get_project(db, project_id, current_user.id)
    stats = await mention_service.get_mentions_stats(db, project_id)
    return await ai_service.generate_ai_report(
        db,
        project_id,
        project_name=project.name,
        project_stats=stats,
        top_k=max(5, min(50, data.top_k)),
    )
