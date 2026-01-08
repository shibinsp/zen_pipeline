from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID


class RepositoryBase(BaseModel):
    name: str
    full_name: str
    provider: str
    url: str


class RepositoryCreate(RepositoryBase):
    organization_id: Optional[UUID] = None  # Auto-assigned from current user if not provided
    default_branch: Optional[str] = "main"
    settings: Optional[Dict[str, Any]] = {}


class RepositoryUpdate(BaseModel):
    name: Optional[str] = None
    default_branch: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None


class RepositoryResponse(RepositoryBase):
    id: UUID
    organization_id: UUID
    default_branch: str = "main"
    language_breakdown: Optional[Dict[str, Any]] = {}
    settings: Optional[Dict[str, Any]] = {}
    health_score: Optional[str] = "A"
    last_scan_at: Optional[datetime] = None
    last_review_data: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    # Computed fields
    open_vulnerabilities: Optional[int] = None
    last_deployment: Optional[datetime] = None
    test_coverage: Optional[float] = None

    class Config:
        from_attributes = True

    def __init__(self, **data):
        # Ensure None values get defaults
        if data.get('language_breakdown') is None:
            data['language_breakdown'] = {}
        if data.get('settings') is None:
            data['settings'] = {}
        if data.get('health_score') is None:
            data['health_score'] = 'A'
        super().__init__(**data)


class RepositoryBrief(BaseModel):
    id: UUID
    name: str
    full_name: str
    provider: str
    health_score: str

    class Config:
        from_attributes = True


class CodeMetricsResponse(BaseModel):
    repository_id: UUID
    cyclomatic_complexity: float
    cognitive_complexity: float
    lines_of_code: int
    test_coverage: float
    documentation_coverage: float
    technical_debt_hours: float
    maintainability_index: float
    code_smells: int
    duplicated_lines_percent: float

    class Config:
        from_attributes = True
