from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta
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
    # Get repository data for analysis
    repo = db.query(Repository).filter(Repository.id == request.repository_id).first()

    # Get deployment history for this repo and environment
    past_deployments = db.query(Deployment).filter(
        Deployment.repository_id == request.repository_id,
        Deployment.environment == request.environment
    ).order_by(Deployment.created_at.desc()).limit(20).all()

    # Calculate historical metrics
    total_past = len(past_deployments)
    successful_past = len([d for d in past_deployments if d.status == DeploymentStatus.COMPLETED])
    failed_past = len([d for d in past_deployments if d.status == DeploymentStatus.FAILED])
    rolled_back_past = len([d for d in past_deployments if d.status == DeploymentStatus.ROLLED_BACK])

    historical_success_rate = successful_past / total_past if total_past > 0 else 0.85

    # Environment risk multiplier
    env_risk = {"development": 0.5, "staging": 1.0, "production": 1.8}.get(request.environment, 1.0)

    # Get repository analysis data
    graph_data = repo.dependency_graph if repo else {}
    nodes = graph_data.get("nodes", []) if graph_data else []
    avg_health = sum(n.get("health_score", 80) for n in nodes) / len(nodes) if nodes else 80

    # Calculate risk factors based on actual data
    risk_factors = []

    # 1. Repository Health Factor
    health_risk = max(0, 100 - avg_health)
    risk_factors.append(RiskFactor(
        category="code_quality",
        factor="Repository Health",
        score=round(health_risk, 1),
        weight=0.25,
        description=f"Repository health score: {avg_health:.0f}%"
    ))

    # 2. Environment Risk Factor
    env_score = env_risk * 30
    risk_factors.append(RiskFactor(
        category="environmental",
        factor="Target Environment",
        score=round(env_score, 1),
        weight=0.20,
        description=f"Deploying to {request.environment} environment"
    ))

    # 3. Historical Success Rate Factor
    history_risk = (1 - historical_success_rate) * 100
    risk_factors.append(RiskFactor(
        category="historical_patterns",
        factor="Deployment History",
        score=round(history_risk, 1),
        weight=0.25,
        description=f"{successful_past}/{total_past} successful deployments ({historical_success_rate*100:.0f}% success rate)"
    ))

    # 4. Rollback Frequency Factor
    rollback_rate = rolled_back_past / total_past if total_past > 0 else 0
    rollback_risk = rollback_rate * 100
    risk_factors.append(RiskFactor(
        category="stability",
        factor="Rollback Frequency",
        score=round(rollback_risk, 1),
        weight=0.15,
        description=f"{rolled_back_past} rollbacks in last {total_past} deployments"
    ))

    # 5. Module Complexity Factor
    module_count = len(nodes)
    complexity_risk = min(50, module_count * 3) if module_count > 0 else 20
    risk_factors.append(RiskFactor(
        category="complexity",
        factor="Architecture Complexity",
        score=round(complexity_risk, 1),
        weight=0.15,
        description=f"{module_count} modules detected in repository"
    ))

    # Calculate total risk score
    total_score = sum(f.score * f.weight for f in risk_factors)
    total_score = min(100, max(0, total_score))

    # Determine risk level
    if total_score < 25:
        risk_level = "low"
    elif total_score < 50:
        risk_level = "medium"
    elif total_score < 75:
        risk_level = "high"
    else:
        risk_level = "critical"

    # Confidence based on data availability
    confidence = "high" if total_past >= 5 and nodes else "medium" if total_past > 0 or nodes else "low"

    # Generate recommendations based on actual analysis
    recommendations = []

    if request.environment == "production":
        recommendations.append("Production deployment - ensure all tests pass before proceeding")

    if historical_success_rate < 0.9 and total_past > 0:
        recommendations.append(f"Historical success rate is {historical_success_rate*100:.0f}% - review recent failures")

    if rollback_rate > 0.1:
        recommendations.append(f"High rollback rate ({rollback_rate*100:.0f}%) - consider more thorough testing")

    if avg_health < 80:
        recommendations.append(f"Repository health ({avg_health:.0f}%) below optimal - review architecture")

    if total_score > 50:
        recommendations.append("Consider using canary or blue-green deployment strategy")

    if not past_deployments:
        recommendations.append("First deployment to this environment - monitor closely")

    # Ensure at least one recommendation
    if not recommendations:
        if total_score < 30:
            recommendations.append("Low risk deployment - proceed with standard monitoring")
        else:
            recommendations.append("Monitor deployment metrics after release")

    return RiskScoreResponse(
        risk_score=round(total_score, 1),
        confidence_level=confidence,
        risk_level=risk_level,
        risk_factors=risk_factors,
        recommendations=recommendations[:5],
        historical_success_rate=round(historical_success_rate, 2)
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

    # Get repository analysis data for risk calculation
    graph_data = repo.dependency_graph if repo else {}
    nodes = graph_data.get("nodes", []) if graph_data else []
    avg_health = sum(n.get("health_score", 80) for n in nodes) / len(nodes) if nodes else 80

    # Get deployment history for this environment
    past_deployments = db.query(Deployment).filter(
        Deployment.repository_id == deployment_data.repository_id,
        Deployment.environment == deployment_data.environment
    ).order_by(Deployment.created_at.desc()).limit(10).all()

    total_past = len(past_deployments)
    successful_past = len([d for d in past_deployments if d.status == DeploymentStatus.COMPLETED])
    historical_success_rate = successful_past / total_past if total_past > 0 else 0.85

    # Calculate risk score based on actual data
    env_risk = {"development": 15, "staging": 35, "production": 55}.get(deployment_data.environment, 30)
    health_risk = max(0, 100 - avg_health) * 0.3
    history_risk = (1 - historical_success_rate) * 30

    risk_score = env_risk + health_risk + history_risk
    risk_score = min(100, max(0, risk_score))

    # Build risk factors from actual data
    risk_factors = {
        "environment_risk": env_risk,
        "repository_health": round(avg_health, 1),
        "historical_success_rate": round(historical_success_rate * 100, 1),
        "module_count": len(nodes)
    }

    # Create deployment as IN_PROGRESS initially
    deployment = Deployment(
        repository_id=deployment_data.repository_id,
        environment=deployment_data.environment,
        version=deployment_data.version,
        commit_sha=deployment_data.commit_sha,
        branch=deployment_data.branch or "main",
        strategy=deployment_data.strategy,
        notes=deployment_data.notes,
        deployed_by=current_user.id,
        risk_score=round(risk_score, 1),
        risk_factors=risk_factors,
        status=DeploymentStatus.IN_PROGRESS,
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
        details={
            "environment": deployment_data.environment,
            "version": deployment_data.version,
            "status": "in_progress",
            "risk_score": round(risk_score, 1)
        }
    )
    db.add(audit)

    db.commit()
    db.refresh(deployment)

    return deployment


@router.post("/{deployment_id}/complete", response_model=DeploymentResponse)
def complete_deployment(
    deployment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Simulate deployment completion - called after a delay by frontend"""
    deployment = db.query(Deployment).filter(Deployment.id == deployment_id).first()
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")

    if deployment.status != DeploymentStatus.IN_PROGRESS:
        return deployment  # Already completed

    # Calculate duration
    duration = int((datetime.utcnow() - deployment.started_at).total_seconds()) if deployment.started_at else 30

    # Determine final status based on risk score
    # Lower risk = higher chance of success
    # Risk 0-30: 95% success, 4% fail, 1% rollback
    # Risk 30-50: 85% success, 10% fail, 5% rollback
    # Risk 50-70: 75% success, 15% fail, 10% rollback
    # Risk 70+: 60% success, 25% fail, 15% rollback

    risk = deployment.risk_score
    status_roll = random.random()

    if risk < 30:
        success_threshold, fail_threshold = 0.95, 0.99
    elif risk < 50:
        success_threshold, fail_threshold = 0.85, 0.95
    elif risk < 70:
        success_threshold, fail_threshold = 0.75, 0.90
    else:
        success_threshold, fail_threshold = 0.60, 0.85

    if status_roll < success_threshold:
        final_status = DeploymentStatus.COMPLETED
    elif status_roll < fail_threshold:
        final_status = DeploymentStatus.FAILED
    else:
        final_status = DeploymentStatus.ROLLED_BACK

    deployment.status = final_status
    deployment.duration_seconds = duration
    deployment.completed_at = datetime.utcnow()

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
        # Get all deployments for this environment (last 20)
        env_deployments = db.query(Deployment).filter(
            Deployment.repository_id == repository_id,
            Deployment.environment == env
        ).order_by(Deployment.created_at.desc()).limit(20).all()

        # Get latest completed deployment
        latest = db.query(Deployment).filter(
            Deployment.repository_id == repository_id,
            Deployment.environment == env,
            Deployment.status == DeploymentStatus.COMPLETED
        ).order_by(Deployment.completed_at.desc()).first()

        # Calculate health score based on deployment success rate
        total_deployments = len(env_deployments)
        successful_deployments = len([d for d in env_deployments if d.status == DeploymentStatus.COMPLETED])
        failed_deployments = len([d for d in env_deployments if d.status == DeploymentStatus.FAILED])
        rolled_back = len([d for d in env_deployments if d.status == DeploymentStatus.ROLLED_BACK])

        # Health score calculation
        if total_deployments > 0:
            success_rate = successful_deployments / total_deployments
            failure_penalty = (failed_deployments * 5) + (rolled_back * 3)  # Failures impact more
            health_score = max(0, min(100, (success_rate * 100) - failure_penalty))
        else:
            health_score = 0

        # Determine status based on health and recent activity
        if total_deployments == 0:
            status = "unknown"
        elif health_score >= 90:
            status = "healthy"
        elif health_score >= 70:
            status = "warning"
        else:
            status = "degraded"

        # Check if there's an in-progress deployment
        in_progress = db.query(Deployment).filter(
            Deployment.repository_id == repository_id,
            Deployment.environment == env,
            Deployment.status == DeploymentStatus.IN_PROGRESS
        ).first()

        if in_progress:
            status = "deploying"

        comparisons.append(EnvironmentComparisonResponse(
            environment=env,
            current_version=latest.version if latest else "N/A",
            last_deployment=latest.completed_at if latest else None,
            status=status,
            health_score=round(health_score, 1)
        ))

    return comparisons
