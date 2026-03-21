from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    RefreshRequest,
    MessageResponse,
)
from app.schemas.user import UserResponse
from app.services import auth_service

router = APIRouter()


@router.post("/register")
async def register(
    data: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    result = await auth_service.register_user(
        db,
        data.name,
        data.email,
        data.password,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    user = result["user"]
    return {
        "access_token": result["access_token"],
        "refresh_token": result["refresh_token"],
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "avatar": user.avatar,
            "role": user.role,
            "locale": user.locale,
            "timezone": user.timezone,
            "createdAt": user.created_at.isoformat() if user.created_at else "",
            "updatedAt": user.updated_at.isoformat() if user.updated_at else "",
        },
    }


@router.post("/login")
async def login(
    data: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    result = await auth_service.login_user(
        db,
        data.email,
        data.password,
        remember_me=data.remember_me,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    user = result["user"]
    return {
        "access_token": result["access_token"],
        "refresh_token": result["refresh_token"],
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "avatar": user.avatar,
            "role": user.role,
            "locale": user.locale,
            "timezone": user.timezone,
            "createdAt": user.created_at.isoformat() if user.created_at else "",
            "updatedAt": user.updated_at.isoformat() if user.updated_at else "",
        },
    }


@router.post("/refresh")
async def refresh(
    data: RefreshRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    result = await auth_service.refresh_tokens(
        db,
        data.refresh_token,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )
    return {
        "access_token": result["access_token"],
        "refresh_token": result["refresh_token"],
        "token_type": "bearer",
    }


@router.post("/logout", response_model=MessageResponse)
async def logout(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    await auth_service.logout_user(db, data.refresh_token)
    return {"message": "Successfully logged out"}


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(db: AsyncSession = Depends(get_db)):
    return {"message": "If the email exists, a reset link has been sent"}


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(db: AsyncSession = Depends(get_db)):
    return {"message": "Password has been reset successfully"}
