from typing import Optional
from pydantic import BaseModel, EmailStr


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    avatar: Optional[str] = None
    role: str
    locale: str
    timezone: str
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class UserSettingsUpdate(BaseModel):
    name: Optional[str] = None
    avatar: Optional[str] = None
    locale: Optional[str] = None
    timezone: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ActiveSessionResponse(BaseModel):
    id: str
    device: str
    location: str
    ip: str
    last_active: str
    current: bool = False


class RevokeOtherSessionsRequest(BaseModel):
    current_refresh_token: str


class DeleteAccountRequest(BaseModel):
    password: str
