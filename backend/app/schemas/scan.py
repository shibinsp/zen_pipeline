from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import UUID


class ScanCreate(BaseModel):
    repository_id: UUID
    commit_sha: str
    branch: Optional[str] = None
    scan_type: str  # security, quality, dependency


class ScanResponse(BaseModel):
    id: UUID
    repository_id: UUID
    commit_sha: str
    branch: Optional[str] = None
    scan_type: str
    status: str
    findings_count: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    metrics: Dict[str, Any]
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class VulnerabilityResponse(BaseModel):
    id: UUID
    scan_id: UUID
    severity: str
    title: str
    description: Optional[str] = None
    file_path: Optional[str] = None
    line_number: Optional[int] = None
    cwe_id: Optional[str] = None
    cvss_score: Optional[str] = None
    status: str
    recommendation: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class VulnerabilitySummary(BaseModel):
    total: int
    critical: int
    high: int
    medium: int
    low: int
    info: int


class PRAnalysisResponse(BaseModel):
    pr_id: str
    repository_id: UUID
    title: str
    author: str
    risk_level: str  # low, medium, high
    risk_score: float
    changes_summary: Dict[str, Any]
    security_issues: List[VulnerabilityResponse]
    quality_issues: List[Dict[str, Any]]
    suggested_reviewers: List[str]
    breaking_changes: List[str]
    impact_analysis: Dict[str, Any]

    class Config:
        from_attributes = True
