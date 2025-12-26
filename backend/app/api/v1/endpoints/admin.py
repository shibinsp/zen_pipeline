from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta
from app.api.deps import get_db, get_current_user, get_platform_admin, get_org_admin_or_above
from app.models.user import User
from app.models.organization import Organization
from app.models.repository import Repository
from app.models.deployment import Deployment
from app.models.scan import ScanResult
from app.models.test_run import TestRun
from app.models.audit_log import AuditLog
from app.schemas.common import PaginatedResponse

router = APIRouter()


class AuditLogResponse:
    pass


@router.get("/users")
def list_all_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    organization_id: Optional[UUID] = None,
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_org_admin_or_above)
):
    query = db.query(User)

    # Filter by org for org admins
    if current_user.role != "platform_admin":
        query = query.filter(User.organization_id == current_user.organization_id)
    elif organization_id:
        query = query.filter(User.organization_id == organization_id)

    if search:
        query = query.filter(
            (User.name.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%"))
        )

    if role:
        query = query.filter(User.role == role)

    total = query.count()
    users = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": [
            {
                "id": str(u.id),
                "email": u.email,
                "name": u.name,
                "role": u.role.value if hasattr(u.role, 'value') else u.role,
                "is_active": u.is_active,
                "last_login": u.last_login.isoformat() if u.last_login else None,
                "created_at": u.created_at.isoformat()
            } for u in users
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }


@router.get("/audit-logs")
def get_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    user_id: Optional[UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_org_admin_or_above)
):
    query = db.query(AuditLog)

    # Filter by org
    if current_user.role != "platform_admin" and current_user.organization_id:
        query = query.filter(AuditLog.organization_id == current_user.organization_id)

    if action:
        query = query.filter(AuditLog.action == action)

    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)

    if user_id:
        query = query.filter(AuditLog.user_id == user_id)

    if start_date:
        query = query.filter(AuditLog.created_at >= start_date)

    if end_date:
        query = query.filter(AuditLog.created_at <= end_date)

    total = query.count()
    logs = query.order_by(AuditLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": [
            {
                "id": str(log.id),
                "user_id": str(log.user_id) if log.user_id else None,
                "action": log.action.value if hasattr(log.action, 'value') else log.action,
                "resource_type": log.resource_type.value if hasattr(log.resource_type, 'value') else log.resource_type,
                "resource_id": str(log.resource_id) if log.resource_id else None,
                "details": log.details,
                "ip_address": log.ip_address,
                "status": log.status,
                "created_at": log.created_at.isoformat()
            } for log in logs
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }


@router.get("/usage")
def get_usage_metrics(
    period: str = Query("30d", regex="^(7d|30d|90d)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_org_admin_or_above)
):
    days = {"7d": 7, "30d": 30, "90d": 90}[period]
    since = datetime.utcnow() - timedelta(days=days)

    org_filter = []
    if current_user.role != "platform_admin" and current_user.organization_id:
        org_filter = [Repository.organization_id == current_user.organization_id]

    # Count metrics
    deployments_count = db.query(func.count(Deployment.id)).join(Repository).filter(
        Deployment.created_at >= since,
        *org_filter
    ).scalar() or 0

    scans_count = db.query(func.count(ScanResult.id)).join(Repository).filter(
        ScanResult.created_at >= since,
        *org_filter
    ).scalar() or 0

    test_runs_count = db.query(func.count(TestRun.id)).join(Repository).filter(
        TestRun.created_at >= since,
        *org_filter
    ).scalar() or 0

    repos_count = db.query(func.count(Repository.id)).filter(*org_filter).scalar() or 0

    users_count = db.query(func.count(User.id)).filter(
        User.organization_id == current_user.organization_id if current_user.organization_id else True
    ).scalar() or 0

    return {
        "period": period,
        "metrics": {
            "deployments": deployments_count,
            "scans": scans_count,
            "test_runs": test_runs_count,
            "repositories": repos_count,
            "users": users_count
        },
        "limits": {
            "deployments_per_day": -1,  # unlimited
            "scans_per_day": -1,
            "repositories": -1,
            "users": -1
        },
        "trends": {
            "deployments": "+12%",
            "scans": "+8%",
            "test_runs": "+15%"
        }
    }


@router.get("/dashboard-stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = today - timedelta(days=7)

    org_filter = []
    if current_user.organization_id:
        org_filter = [Repository.organization_id == current_user.organization_id]

    # Today's deployments
    deployments_today = db.query(func.count(Deployment.id)).join(Repository).filter(
        Deployment.created_at >= today,
        *org_filter
    ).scalar() or 0

    # Active scans
    active_scans = db.query(func.count(ScanResult.id)).join(Repository).filter(
        ScanResult.status.in_(["pending", "running"]),
        *org_filter
    ).scalar() or 0

    # Test pass rate (last 7 days)
    test_runs = db.query(TestRun).join(Repository).filter(
        TestRun.created_at >= week_ago,
        TestRun.status == "completed",
        *org_filter
    ).all()

    if test_runs:
        total_passed = sum(t.passed for t in test_runs)
        total_tests = sum(t.total_tests for t in test_runs)
        test_pass_rate = (total_passed / total_tests * 100) if total_tests > 0 else 0
    else:
        test_pass_rate = 0

    # Open vulnerabilities
    from app.models.scan import Vulnerability
    open_vulns = db.query(func.count(Vulnerability.id)).join(ScanResult).join(Repository).filter(
        Vulnerability.status == "open",
        *org_filter
    ).scalar() or 0

    return {
        "deployments_today": deployments_today,
        "active_scans": active_scans,
        "test_pass_rate": round(test_pass_rate, 1),
        "open_vulnerabilities": open_vulns,
        "system_health": "healthy",
        "trends": {
            "deployments": {"value": 12, "direction": "up"},
            "vulnerabilities": {"value": -5, "direction": "down"},
            "test_pass_rate": {"value": 2.3, "direction": "up"}
        }
    }


@router.get("/integrations")
def list_integrations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_org_admin_or_above)
):
    # Mock integrations - would be stored in DB in production
    return {
        "integrations": [
            {
                "id": "github",
                "name": "GitHub",
                "type": "source_control",
                "status": "connected",
                "connected_at": "2024-01-15T10:30:00Z",
                "config": {"org": "nxzen", "repos": 12}
            },
            {
                "id": "slack",
                "name": "Slack",
                "type": "communication",
                "status": "connected",
                "connected_at": "2024-01-10T08:00:00Z",
                "config": {"channel": "#deployments"}
            },
            {
                "id": "datadog",
                "name": "Datadog",
                "type": "observability",
                "status": "disconnected",
                "connected_at": None,
                "config": {}
            },
            {
                "id": "jira",
                "name": "Jira",
                "type": "ticketing",
                "status": "connected",
                "connected_at": "2024-01-12T14:20:00Z",
                "config": {"project": "ZEN"}
            }
        ]
    }


@router.post("/integrations/{integration_id}/connect")
def connect_integration(
    integration_id: str,
    config: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_org_admin_or_above)
):
    # Mock connection - would actually connect to the service
    return {
        "message": f"Integration {integration_id} connected successfully",
        "status": "connected"
    }


@router.delete("/integrations/{integration_id}")
def disconnect_integration(
    integration_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_org_admin_or_above)
):
    return {
        "message": f"Integration {integration_id} disconnected",
        "status": "disconnected"
    }
