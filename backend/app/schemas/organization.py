from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID


class OrganizationBase(BaseModel):
    name: str
    slug: str


class OrganizationCreate(OrganizationBase):
    plan: Optional[str] = "starter"
    settings: Optional[Dict[str, Any]] = {}


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    plan: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None
    logo_url: Optional[str] = None


class OrganizationResponse(OrganizationBase):
    id: UUID
    plan: str
    settings: Dict[str, Any]
    logo_url: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    user_count: Optional[int] = None
    repo_count: Optional[int] = None

    class Config:
        from_attributes = True


class OrganizationBrief(BaseModel):
    id: UUID
    name: str
    slug: str
    logo_url: Optional[str] = None

    class Config:
        from_attributes = True
