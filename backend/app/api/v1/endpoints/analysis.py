from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.scan import ScanResult, Vulnerability, ScanStatus
from app.models.repository import Repository
from app.schemas.scan import ScanCreate, ScanResponse, VulnerabilityResponse, PRAnalysisResponse
from app.schemas.repository import CodeMetricsResponse
from app.schemas.common import PaginatedResponse

router = APIRouter()


@router.post("/scan", response_model=ScanResponse)
def trigger_scan(
    scan_data: ScanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify repository exists
    repo = db.query(Repository).filter(Repository.id == scan_data.repository_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    scan = ScanResult(
        repository_id=scan_data.repository_id,
        commit_sha=scan_data.commit_sha,
        branch=scan_data.branch,
        scan_type=scan_data.scan_type,
        status=ScanStatus.PENDING,
        started_at=datetime.utcnow()
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)

    # Update repository last scan
    repo.last_scan_at = datetime.utcnow()
    db.commit()

    return scan


@router.get("/scan/{scan_id}", response_model=ScanResponse)
def get_scan(
    scan_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    scan = db.query(ScanResult).filter(ScanResult.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    return scan


@router.get("/scans", response_model=PaginatedResponse[ScanResponse])
def list_scans(
    repository_id: Optional[UUID] = None,
    scan_type: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ScanResult)

    if repository_id:
        query = query.filter(ScanResult.repository_id == repository_id)

    if scan_type:
        query = query.filter(ScanResult.scan_type == scan_type)

    if status:
        query = query.filter(ScanResult.status == status)

    total = query.count()
    scans = query.order_by(ScanResult.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(
        items=scans,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/vulnerabilities", response_model=PaginatedResponse[VulnerabilityResponse])
def list_vulnerabilities(
    repository_id: Optional[UUID] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Vulnerability).join(ScanResult)

    if repository_id:
        query = query.filter(ScanResult.repository_id == repository_id)

    if severity:
        query = query.filter(Vulnerability.severity == severity)

    if status:
        query = query.filter(Vulnerability.status == status)

    total = query.count()
    vulnerabilities = query.order_by(Vulnerability.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(
        items=vulnerabilities,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/pr/{pr_id}", response_model=PRAnalysisResponse)
def get_pr_analysis(
    pr_id: str,
    repository_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Mock PR analysis response - would integrate with GitHub/GitLab API
    return PRAnalysisResponse(
        pr_id=pr_id,
        repository_id=repository_id,
        title="Feature: Add user authentication",
        author="developer@example.com",
        risk_level="medium",
        risk_score=45.5,
        changes_summary={
            "files_changed": 12,
            "additions": 450,
            "deletions": 120,
            "modified_components": ["auth", "api", "models"]
        },
        security_issues=[],
        quality_issues=[],
        suggested_reviewers=["senior-dev@example.com", "security-lead@example.com"],
        breaking_changes=[],
        impact_analysis={
            "affected_services": ["api-gateway", "user-service"],
            "test_coverage_impact": "+5%"
        }
    )


@router.get("/metrics/{repo_id}", response_model=CodeMetricsResponse)
def get_code_metrics(
    repo_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    # Return mock metrics - would calculate from actual scans
    return CodeMetricsResponse(
        repository_id=repo_id,
        cyclomatic_complexity=12.5,
        cognitive_complexity=18.3,
        lines_of_code=45000,
        test_coverage=78.5,
        documentation_coverage=65.2,
        technical_debt_hours=120,
        maintainability_index=72.8,
        code_smells=45,
        duplicated_lines_percent=3.2
    )


@router.patch("/vulnerabilities/{vuln_id}/status")
def update_vulnerability_status(
    vuln_id: UUID,
    status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    vuln = db.query(Vulnerability).filter(Vulnerability.id == vuln_id).first()
    if not vuln:
        raise HTTPException(status_code=404, detail="Vulnerability not found")

    vuln.status = status
    db.commit()

    return {"message": "Status updated successfully"}
