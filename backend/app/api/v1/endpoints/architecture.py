from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta
import random
from app.api.deps import get_db, get_current_user, get_org_admin_or_above
from app.models.user import User
from app.models.architecture import ArchitectureRule, DependencyViolation
from app.models.repository import Repository
from app.schemas.architecture import (
    RuleCreate, RuleUpdate, RuleResponse, ViolationResponse,
    DependencyGraphResponse, DependencyNode, DependencyEdge,
    ValidateRequest, ValidateResponse, ValidationResult,
    DriftReport, ComplianceStatus
)
from app.schemas.common import PaginatedResponse

router = APIRouter()


@router.get("/dependencies/{repo_id}", response_model=DependencyGraphResponse)
def get_dependency_graph(
    repo_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    # Mock dependency graph
    nodes = [
        DependencyNode(id="api", name="API Layer", type="module", size=150, health_score=92),
        DependencyNode(id="services", name="Services", type="module", size=200, health_score=88),
        DependencyNode(id="models", name="Models", type="module", size=80, health_score=95),
        DependencyNode(id="utils", name="Utilities", type="module", size=60, health_score=90),
        DependencyNode(id="auth", name="Authentication", type="module", size=100, health_score=85),
        DependencyNode(id="db", name="Database", type="module", size=120, health_score=91),
        DependencyNode(id="external", name="External APIs", type="service", size=70, health_score=78),
    ]

    edges = [
        DependencyEdge(source="api", target="services", weight=5, type="call"),
        DependencyEdge(source="api", target="auth", weight=3, type="call"),
        DependencyEdge(source="services", target="models", weight=8, type="import"),
        DependencyEdge(source="services", target="db", weight=6, type="call"),
        DependencyEdge(source="services", target="utils", weight=4, type="import"),
        DependencyEdge(source="services", target="external", weight=2, type="call"),
        DependencyEdge(source="auth", target="models", weight=2, type="import"),
        DependencyEdge(source="auth", target="db", weight=3, type="call"),
        DependencyEdge(source="db", target="models", weight=5, type="import"),
    ]

    return DependencyGraphResponse(
        repository_id=repo_id,
        nodes=nodes,
        edges=edges,
        circular_dependencies=[],
        layers={
            "presentation": ["api"],
            "business": ["services", "auth"],
            "data": ["models", "db"],
            "infrastructure": ["utils", "external"]
        }
    )


@router.post("/validate", response_model=ValidateResponse)
def validate_architecture(
    request: ValidateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = db.query(Repository).filter(Repository.id == request.repository_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    # Get rules
    if request.rules:
        rules = db.query(ArchitectureRule).filter(ArchitectureRule.id.in_(request.rules)).all()
    else:
        rules = db.query(ArchitectureRule).filter(
            ArchitectureRule.organization_id == repo.organization_id,
            ArchitectureRule.enabled == True
        ).all()

    # Mock validation results
    results = []
    passed_count = 0
    for rule in rules:
        passed = random.random() > 0.3
        if passed:
            passed_count += 1
            violations = []
        else:
            violations = [
                ViolationResponse(
                    id=UUID("00000000-0000-0000-0000-000000000001"),
                    repository_id=request.repository_id,
                    rule_id=rule.id,
                    rule_name=rule.name,
                    source_module="services.user",
                    target_module="api.endpoints",
                    violation_type="layer_violation",
                    file_path="src/services/user.py",
                    line_number="45",
                    details={"message": "Service layer should not import from API layer"},
                    is_resolved=False,
                    detected_at=datetime.utcnow()
                )
            ]

        results.append(ValidationResult(
            rule_id=rule.id,
            rule_name=rule.name,
            passed=passed,
            violations=violations
        ))

    return ValidateResponse(
        repository_id=request.repository_id,
        passed=passed_count == len(rules),
        total_rules=len(rules),
        passed_rules=passed_count,
        failed_rules=len(rules) - passed_count,
        results=results
    )


@router.get("/drift/{repo_id}", response_model=DriftReport)
def get_drift_report(
    repo_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    return DriftReport(
        repository_id=repo_id,
        baseline_date=datetime.utcnow() - timedelta(days=30),
        current_date=datetime.utcnow(),
        drift_score=15.5,
        changes=[
            {"type": "new_dependency", "module": "services.analytics", "details": "Added new analytics service"},
            {"type": "modified", "module": "api.endpoints", "details": "15 new endpoints added"},
        ],
        new_dependencies=["pandas", "numpy", "scipy"],
        removed_dependencies=["deprecated-lib"],
        layer_violations=[],
        recommendations=[
            "Consider extracting analytics to a separate service",
            "Review new dependencies for security vulnerabilities"
        ]
    )


@router.get("/rules", response_model=PaginatedResponse[RuleResponse])
def list_rules(
    organization_id: Optional[UUID] = None,
    rule_type: Optional[str] = None,
    enabled: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ArchitectureRule)

    org_id = organization_id or current_user.organization_id
    if org_id:
        query = query.filter(ArchitectureRule.organization_id == org_id)

    if rule_type:
        query = query.filter(ArchitectureRule.rule_type == rule_type)

    if enabled is not None:
        query = query.filter(ArchitectureRule.enabled == enabled)

    total = query.count()
    rules = query.offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(
        items=rules,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.post("/rules", response_model=RuleResponse)
def create_rule(
    rule_data: RuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_org_admin_or_above)
):
    rule = ArchitectureRule(**rule_data.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)

    return rule


@router.get("/rules/{rule_id}", response_model=RuleResponse)
def get_rule(
    rule_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    rule = db.query(ArchitectureRule).filter(ArchitectureRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    return rule


@router.patch("/rules/{rule_id}", response_model=RuleResponse)
def update_rule(
    rule_id: UUID,
    rule_data: RuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_org_admin_or_above)
):
    rule = db.query(ArchitectureRule).filter(ArchitectureRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    update_data = rule_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(rule, field, value)

    db.commit()
    db.refresh(rule)

    return rule


@router.delete("/rules/{rule_id}")
def delete_rule(
    rule_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_org_admin_or_above)
):
    rule = db.query(ArchitectureRule).filter(ArchitectureRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    db.delete(rule)
    db.commit()

    return {"message": "Rule deleted successfully"}


@router.get("/compliance/{repo_id}", response_model=ComplianceStatus)
def get_compliance_status(
    repo_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    return ComplianceStatus(
        repository_id=repo_id,
        overall_score=85.5,
        rules_compliant=12,
        rules_violated=3,
        critical_violations=0,
        last_checked=datetime.utcnow(),
        trend="improving"
    )
