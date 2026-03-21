from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.user import (
    UserResponse,
    UserSettingsUpdate,
    ChangePasswordRequest,
    RevokeOtherSessionsRequest,
    DeleteAccountRequest,
)
from app.schemas.auth import MessageResponse
from app.services import user_service

router = APIRouter()


@router.get("")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "avatar": current_user.avatar,
        "role": current_user.role,
        "locale": current_user.locale,
        "timezone": current_user.timezone,
        "createdAt": current_user.created_at.isoformat() if current_user.created_at else "",
        "updatedAt": current_user.updated_at.isoformat() if current_user.updated_at else "",
    }


@router.get("/settings", response_model=UserResponse)
async def get_settings(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        avatar=current_user.avatar,
        role=current_user.role,
        locale=current_user.locale,
        timezone=current_user.timezone,
        created_at=current_user.created_at.isoformat() if current_user.created_at else "",
        updated_at=current_user.updated_at.isoformat() if current_user.updated_at else "",
    )


@router.put("/settings", response_model=UserResponse)
async def update_settings(
    data: UserSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    updated = await user_service.update_user_settings(
        db, current_user, data.model_dump(exclude_unset=True)
    )
    return UserResponse(
        id=updated.id,
        email=updated.email,
        name=updated.name,
        avatar=updated.avatar,
        role=updated.role,
        locale=updated.locale,
        timezone=updated.timezone,
        created_at=updated.created_at.isoformat() if updated.created_at else "",
        updated_at=updated.updated_at.isoformat() if updated.updated_at else "",
    )


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    data: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await user_service.change_password(db, current_user, data.current_password, data.new_password)
    return {"message": "Password changed successfully"}


@router.get("/sessions")
async def get_sessions(
    current_refresh_token: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await user_service.list_active_sessions(db, current_user, current_refresh_token)


@router.delete("/sessions/{session_id}", response_model=MessageResponse)
async def revoke_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await user_service.revoke_session(db, current_user, session_id)
    return {"message": "Session revoked"}


@router.post("/sessions/revoke-others", response_model=MessageResponse)
async def revoke_other_sessions(
    data: RevokeOtherSessionsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await user_service.revoke_other_sessions(db, current_user, data.current_refresh_token)
    return {"message": "Other sessions revoked"}


@router.post("/delete-account", response_model=MessageResponse)
async def delete_account(
    data: DeleteAccountRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await user_service.delete_account(db, current_user, data.password)
    return {"message": "Account deleted successfully"}
