from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.schemas.user import UserBrief


class TeamBase(BaseModel):
    name: str
    description: Optional[str] = None


class TeamCreate(TeamBase):
    organization_id: UUID


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class TeamMemberAdd(BaseModel):
    user_id: UUID
    role: Optional[str] = "member"


class TeamMemberResponse(BaseModel):
    user: UserBrief
    role: str
    joined_at: datetime

    class Config:
        from_attributes = True


class TeamResponse(TeamBase):
    id: UUID
    organization_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    member_count: Optional[int] = None
    members: Optional[List[TeamMemberResponse]] = None

    class Config:
        from_attributes = True
