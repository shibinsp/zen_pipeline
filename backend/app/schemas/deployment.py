from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import UUID
from app.schemas.user import UserBrief


class DeploymentCreate(BaseModel):
    repository_id: UUID
    environment: str  # development, staging, production
    version: str
    commit_sha: str
    branch: Optional[str] = None
    strategy: Optional[str] = "rolling"
    notes: Optional[str] = None


class DeploymentResponse(BaseModel):
    id: UUID
    repository_id: UUID
    environment: str
    version: str
    commit_sha: str
    branch: Optional[str] = None
    risk_score: float
    risk_factors: Dict[str, Any]
    status: str
    strategy: str
    deployed_by: UUID
    deployed_by_user: Optional[UserBrief] = None
    rollback_from: Optional[UUID] = None
    duration_seconds: Optional[int] = None
    impact_metrics: Dict[str, Any]
    notes: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class RiskScoreRequest(BaseModel):
    repository_id: UUID
    commit_sha: str
    environment: str
    changes: Optional[Dict[str, Any]] = None


class RiskFactor(BaseModel):
    category: str
    factor: str
    score: float
    weight: float
    description: str


class RiskScoreResponse(BaseModel):
    risk_score: float
    confidence_level: str  # low, medium, high
    risk_level: str  # low, medium, high, critical
    risk_factors: List[RiskFactor]
    recommendations: List[str]
    historical_success_rate: Optional[float] = None


class DeploymentMetricResponse(BaseModel):
    id: UUID
    deployment_id: UUID
    metric_name: str
    metric_type: str
    before_value: Optional[float] = None
    after_value: Optional[float] = None
    change_percent: Optional[float] = None
    is_anomaly: str
    recorded_at: datetime

    class Config:
        from_attributes = True


class DeploymentImpactResponse(BaseModel):
    deployment_id: UUID
    metrics: List[DeploymentMetricResponse]
    anomalies_detected: int
    overall_impact: str  # positive, neutral, negative
    business_impact: Optional[Dict[str, Any]] = None


class RollbackRequest(BaseModel):
    reason: Optional[str] = None


class EnvironmentComparisonResponse(BaseModel):
    environment: str
    current_version: str
    last_deployment: Optional[datetime] = None
    status: str
    health_score: float
