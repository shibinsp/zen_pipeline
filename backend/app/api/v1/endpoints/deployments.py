from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime
import random
from app.api.deps import get_db, get_current_user, get_team_lead_or_above
from app.models.user import User
from app.models.deployment import Deployment, DeploymentMetric, DeploymentStatus
from app.models.repository import Repository
from app.models.audit_log import AuditLog, AuditAction, ResourceType
from app.schemas.deployment import (
    DeploymentCreate, DeploymentResponse, RiskScoreRequest, RiskScoreResponse,
    RiskFactor, DeploymentImpactResponse, DeploymentMetricResponse, RollbackRequest,
    EnvironmentComparisonResponse
)
from app.schemas.common import PaginatedResponse

router = APIRouter()


@router.post("/risk-score", response_model=RiskScoreResponse)
def calculate_risk_score(
    request: RiskScoreRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Mock risk calculation - would use ML model in production
    base_score = random.uniform(20, 60)

    risk_factors = [
        RiskFactor(
            category="code_changes",
            factor="Lines of code changed",
            score=random.uniform(10, 30),
            weight=0.25,
            description="450 lines changed across 12 files"
        ),
        RiskFactor(
            category="code_changes",
            factor="Database migration",
            score=random.uniform(15, 35),
            weight=0.20,
            description="Contains 2 database migrations"
        ),
        RiskFactor(
            category="historical_patterns",
            factor="Author success rate",
            score=random.uniform(5, 20),
            weight=0.15,
            description="Author has 95% deployment success rate"
        ),
        RiskFactor(
            category="testing_confidence",
            factor="Test coverage",
            score=random.uniform(10, 25),
            weight=0.25,
            description="78% test coverage on changed files"
        ),
        RiskFactor(
            category="environmental",
            factor="System load",
            score=random.uniform(5, 15),
            weight=0.15,
            description="Current system load is normal"
        )
    ]

    total_score = sum(f.score * f.weight for f in risk_factors)
    risk_level = "low" if total_score < 30 else "medium" if total_score < 60 else "high" if total_score < 80 else "critical"
    confidence = "high" if len(risk_factors) >= 5 else "medium" if len(risk_factors) >= 3 else "low"

    recommendations = []
    if total_score > 50:
        recommendations.append("Consider deploying during low-traffic hours")
    if total_score > 70:
        recommendations.append("Recommend additional code review before deployment")
        recommendations.append("Enable canary deployment strategy")

    return RiskScoreResponse(
        risk_score=round(total_score, 1),
        confidence_level=confidence,
        risk_level=risk_level,
        risk_factors=risk_factors,
        recommendations=recommendations,
        historical_success_rate=0.94
    )


@router.get("", response_model=PaginatedResponse[DeploymentResponse])
def list_deployments(
    repository_id: Optional[UUID] = None,
    environment: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Deployment)

    if repository_id:
        query = query.filter(Deployment.repository_id == repository_id)

    if environment:
        query = query.filter(Deployment.environment == environment)

    if status:
        query = query.filter(Deployment.status == status)

    total = query.count()
    deployments = query.order_by(Deployment.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(
        items=deployments,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.post("", response_model=DeploymentResponse)
def create_deployment(
    deployment_data: DeploymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify repository
    repo = db.query(Repository).filter(Repository.id == deployment_data.repository_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    # Calculate risk score
    risk_score = random.uniform(20, 70)

    deployment = Deployment(
        repository_id=deployment_data.repository_id,
        environment=deployment_data.environment,
        version=deployment_data.version,
        commit_sha=deployment_data.commit_sha,
        branch=deployment_data.branch,
        strategy=deployment_data.strategy,
        notes=deployment_data.notes,
        deployed_by=current_user.id,
        risk_score=risk_score,
        risk_factors={"calculated": True},
        status=DeploymentStatus.PENDING,
        started_at=datetime.utcnow()
    )
    db.add(deployment)

    # Audit log
    audit = AuditLog(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action=AuditAction.DEPLOY,
        resource_type=ResourceType.DEPLOYMENT,
        resource_id=deployment.id,
        details={"environment": deployment_data.environment, "version": deployment_data.version}
    )
    db.add(audit)

    db.commit()
    db.refresh(deployment)

    return deployment


@router.get("/{deployment_id}", response_model=DeploymentResponse)
def get_deployment(
    deployment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    deployment = db.query(Deployment).filter(Deployment.id == deployment_id).first()
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")

    return deployment


@router.post("/{deployment_id}/rollback", response_model=DeploymentResponse)
def rollback_deployment(
    deployment_id: UUID,
    rollback_data: RollbackRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_team_lead_or_above)
):
    deployment = db.query(Deployment).filter(Deployment.id == deployment_id).first()
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")

    # Create rollback deployment
    rollback = Deployment(
        repository_id=deployment.repository_id,
        environment=deployment.environment,
        version=f"rollback-{deployment.version}",
        commit_sha=deployment.commit_sha,
        branch=deployment.branch,
        strategy="recreate",
        deployed_by=current_user.id,
        rollback_from=deployment_id,
        risk_score=15.0,
        notes=rollback_data.reason,
        status=DeploymentStatus.IN_PROGRESS,
        started_at=datetime.utcnow()
    )
    db.add(rollback)

    # Update original deployment status
    deployment.status = DeploymentStatus.ROLLED_BACK

    # Audit log
    audit = AuditLog(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action=AuditAction.ROLLBACK,
        resource_type=ResourceType.DEPLOYMENT,
        resource_id=deployment_id,
        details={"reason": rollback_data.reason}
    )
    db.add(audit)

    db.commit()
    db.refresh(rollback)

    return rollback


@router.get("/{deployment_id}/impact", response_model=DeploymentImpactResponse)
def get_deployment_impact(
    deployment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    deployment = db.query(Deployment).filter(Deployment.id == deployment_id).first()
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")

    # Mock impact metrics
    metrics = [
        DeploymentMetricResponse(
            id=UUID("00000000-0000-0000-0000-000000000001"),
            deployment_id=deployment_id,
            metric_name="Response Time (p95)",
            metric_type="latency",
            before_value=145.0,
            after_value=138.0,
            change_percent=-4.8,
            is_anomaly="no",
            recorded_at=datetime.utcnow()
        ),
        DeploymentMetricResponse(
            id=UUID("00000000-0000-0000-0000-000000000002"),
            deployment_id=deployment_id,
            metric_name="Error Rate",
            metric_type="error",
            before_value=0.5,
            after_value=0.3,
            change_percent=-40.0,
            is_anomaly="no",
            recorded_at=datetime.utcnow()
        ),
        DeploymentMetricResponse(
            id=UUID("00000000-0000-0000-0000-000000000003"),
            deployment_id=deployment_id,
            metric_name="CPU Usage",
            metric_type="infrastructure",
            before_value=45.0,
            after_value=48.0,
            change_percent=6.7,
            is_anomaly="no",
            recorded_at=datetime.utcnow()
        )
    ]

    return DeploymentImpactResponse(
        deployment_id=deployment_id,
        metrics=metrics,
        anomalies_detected=0,
        overall_impact="positive",
        business_impact={"estimated_improvement": "+2% conversion rate"}
    )


@router.get("/environments/compare", response_model=List[EnvironmentComparisonResponse])
def compare_environments(
    repository_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    environments = ["development", "staging", "production"]
    comparisons = []

    for env in environments:
        latest = db.query(Deployment).filter(
            Deployment.repository_id == repository_id,
            Deployment.environment == env,
            Deployment.status == DeploymentStatus.COMPLETED
        ).order_by(Deployment.completed_at.desc()).first()

        comparisons.append(EnvironmentComparisonResponse(
            environment=env,
            current_version=latest.version if latest else "N/A",
            last_deployment=latest.completed_at if latest else None,
            status="healthy" if latest else "unknown",
            health_score=random.uniform(85, 99) if latest else 0
        ))

    return comparisons
