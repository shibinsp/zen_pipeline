from pydantic import BaseModel
from typing import Generic, TypeVar, List, Optional
from datetime import datetime

T = TypeVar('T')


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class MessageResponse(BaseModel):
    message: str
    success: bool = True


class TimestampMixin(BaseModel):
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
