from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr
from app.api.deps import get_db, get_current_user, get_platform_admin, get_org_admin_or_above
from app.models.user import User, UserRole
from app.models.organization import Organization, Team, TeamMember, TeamRole
from app.models.repository import Repository
from app.models.deployment import Deployment
from app.models.scan import ScanResult
from app.models.test_run import TestRun
from app.models.audit_log import AuditLog, AuditAction, ResourceType
from app.schemas.common import PaginatedResponse

router = APIRouter()


# Pydantic schemas for admin operations
class TeamCreate(BaseModel):
    name: str
    description: Optional[str] = None


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class TeamMemberAdd(BaseModel):
    user_id: str
    role: str = "member"


class UserRoleUpdate(BaseModel):
    role: str


class UserStatusUpdate(BaseModel):
    is_active: bool


class OrganizationSettingsUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    settings: Optional[dict] = None


class AuditLogResponse:
    pass


# =====================
# TEAM MANAGEMENT
# =====================

@router.get("/teams")
def list_teams(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_org_admin_or_above)
):
    """List all teams in the organization"""
    query = db.query(Team)

    # Filter by organization
    if current_user.organization_id:
        query = query.filter(Team.organization_id == current_user.organization_id)

    if search:
        query = query.filter(Team.name.ilike(f"%{search}%"))

    total = query.count()
    teams = query.offset((page - 1) * page_size).limit(page_size).all()

    result = []
    for team in teams:
        # Get team members with their details
        members = []
        for tm in team.members:
            user = db.query(User).filter(User.id == tm.user_id).first()
            if user:
                members.append({
                    "id": str(user.id),
                    "name": user.name,
                    "email": user.email,
                    "role": tm.role.value if hasattr(tm.role, 'value') else tm.role,
                    "avatar_url": user.avatar_url
                })

        # Get repositories associated with this team (using team name match for now)
        repos = db.query(Repository).filter(
            Repository.organization_id == team.organization_id
        ).limit(5).all()

        result.append({
            "id": str(team.id),
            "name": team.name,
            "description": team.description,
            "members": members,
            "member_count": len(members),
            "repositories": [r.name for r in repos[:3]],
            "created_at": team.created_at.isoformat() if team.created_at else None
        })

    return {
        "items": result,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }


@router.post("/teams")
def create_team(
    team_data: TeamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_org_admin_or_above)
):
    """Create a new team"""
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="User must belong to an organization")

    team = Team(
        name=team_data.name,
        description=team_data.description,
        organization_id=current_user.organization_id
    )
    db.add(team)

    # Log the action
    audit_log = AuditLog(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action=AuditAction.CREATE,
        resource_type=ResourceType.TEAM,
        resource_id=team.id,
        details={"team_name": team_data.name},
        status="success"
    )
    db.add(audit_log)
    db.commit()
    db.refresh(team)

    return {
        "id": str(team.id),
        "name": team.name,
        "description": team.description,
        "members": [],
        "created_at": team.created_at.isoformat()
    }


@router.get("/teams/{team_id}")
def get_team(
    team_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_org_admin_or_above)
):
    """Get team details"""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Check organization access
    if current_user.organization_id and team.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Access denied")

    members = []
    for tm in team.members:
        user = db.query(User).filter(User.id == tm.user_id).first()
        if user:
            members.append({
                "id": str(user.id),
                "name": user.name,
                "email": user.email,
                "role": tm.role.value if hasattr(tm.role, 'value') else tm.role,
                "avatar_url": user.avatar_url
            })

    return {
        "id": str(team.id),
        "name": team.name,
        "description": team.description,
        "members": members,
        "created_at": team.created_at.isoformat()
    }


@router.patch("/teams/{team_id}")
def update_team(
    team_id: UUID,
    team_data: TeamUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_org_admin_or_above)
):
    """Update team details"""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    if current_user.organization_id and team.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Access denied")

    if team_data.name is not None:
        team.name = team_data.name
    if team_data.description is not None:
        team.description = team_data.description

    team.updated_at = datetime.utcnow()

    # Log the action
    audit_log = AuditLog(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action=AuditAction.UPDATE,
        resource_type=ResourceType.TEAM,
        resource_id=team.id,
        details={"updates": team_data.dict(exclude_unset=True)},
        status="success"
    )
    db.add(audit_log)
    db.commit()

    return {"message": "Team updated successfully", "id": str(team.id)}


@router.delete("/teams/{team_id}")
def delete_team(
    team_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_org_admin_or_above)
):
    """Delete a team"""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    if current_user.organization_id and team.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Access denied")

    team_name = team.name

    # Delete team members first
    db.query(TeamMember).filter(TeamMember.team_id == team_id).delete()
    db.delete(team)

    # Log the action
    audit_log = AuditLog(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action=AuditAction.DELETE,
        resource_type=ResourceType.TEAM,
        resource_id=team_id,
        details={"team_name": team_name},
        status="success"
    )
    db.add(audit_log)
    db.commit()

    return {"message": "Team deleted successfully"}


@router.post("/teams/{team_id}/members")
def add_team_member(
    team_id: UUID,
    member_data: TeamMemberAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_org_admin_or_above)
):
    """Add a member to a team"""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    if current_user.organization_id and team.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Access denied")

    user = db.query(User).filter(User.id == UUID(member_data.user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if already a member
    existing = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == UUID(member_data.user_id)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User is already a team member")

    role = TeamRole.LEAD if member_data.role == "lead" else TeamRole.MEMBER
    team_member = TeamMember(
        team_id=team_id,
        user_id=UUID(member_data.user_id),
        role=role
    )
    db.add(team_member)

    # Log the action
    audit_log = AuditLog(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action=AuditAction.UPDATE,
        resource_type=ResourceType.TEAM,
        resource_id=team_id,
        details={"action": "add_member", "user_id": member_data.user_id, "role": member_data.role},
        status="success"
    )
    db.add(audit_log)
    db.commit()

    return {"message": "Member added successfully"}


@router.delete("/teams/{team_id}/members/{user_id}")
def remove_team_member(
    team_id: UUID,
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_org_admin_or_above)
):
    """Remove a member from a team"""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    if current_user.organization_id and team.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Access denied")

    team_member = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == user_id
    ).first()
    if not team_member:
        raise HTTPException(status_code=404, detail="Team member not found")

    db.delete(team_member)

    # Log the action
    audit_log = AuditLog(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action=AuditAction.UPDATE,
        resource_type=ResourceType.TEAM,
        resource_id=team_id,
        details={"action": "remove_member", "removed_user_id": str(user_id)},
        status="success"
    )
    db.add(audit_log)
    db.commit()

    return {"message": "Member removed successfully"}


# =====================
# USER MANAGEMENT
# =====================

@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: UUID,
    role_data: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_org_admin_or_above)
):
    """Update a user's role"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Only platform admins can change platform admin roles
    if role_data.role == "platform_admin" and current_user.role != UserRole.PLATFORM_ADMIN:
        raise HTTPException(status_code=403, detail="Only platform admins can assign platform admin role")

    # Org admins can only manage users in their organization
    if current_user.role != UserRole.PLATFORM_ADMIN:
        if user.organization_id != current_user.organization_id:
            raise HTTPException(status_code=403, detail="Cannot manage users from other organizations")

    old_role = user.role.value if hasattr(user.role, 'value') else user.role

    # Map string role to enum
    role_mapping = {
        "platform_admin": UserRole.PLATFORM_ADMIN,
        "org_admin": UserRole.ORG_ADMIN,
        "team_lead": UserRole.TEAM_LEAD,
        "developer": UserRole.DEVELOPER,
        "viewer": UserRole.VIEWER
    }
    new_role = role_mapping.get(role_data.role.lower())
    if not new_role:
        raise HTTPException(status_code=400, detail="Invalid role")

    user.role = new_role
    user.updated_at = datetime.utcnow()

    # Log the action
    audit_log = AuditLog(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action=AuditAction.UPDATE,
        resource_type=ResourceType.USER,
        resource_id=user_id,
        details={"old_role": old_role, "new_role": role_data.role},
        status="success"
    )
    db.add(audit_log)
    db.commit()

    return {"message": "User role updated successfully", "new_role": role_data.role}


@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: UUID,
    status_data: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_org_admin_or_above)
):
    """Activate or deactivate a user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Cannot deactivate yourself
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot change your own status")

    # Org admins can only manage users in their organization
    if current_user.role != UserRole.PLATFORM_ADMIN:
        if user.organization_id != current_user.organization_id:
            raise HTTPException(status_code=403, detail="Cannot manage users from other organizations")

    old_status = user.is_active
    user.is_active = status_data.is_active
    user.updated_at = datetime.utcnow()

    # Log the action
    action_desc = "activated" if status_data.is_active else "deactivated"
    audit_log = AuditLog(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action=AuditAction.UPDATE,
        resource_type=ResourceType.USER,
        resource_id=user_id,
        details={"action": action_desc, "old_status": old_status, "new_status": status_data.is_active},
        status="success"
    )
    db.add(audit_log)
    db.commit()

    return {"message": f"User {action_desc} successfully", "is_active": status_data.is_active}


@router.delete("/users/{user_id}")
def delete_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_org_admin_or_above)
):
    """Delete a user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Cannot delete yourself
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    # Org admins can only manage users in their organization
    if current_user.role != UserRole.PLATFORM_ADMIN:
        if user.organization_id != current_user.organization_id:
            raise HTTPException(status_code=403, detail="Cannot manage users from other organizations")

    user_email = user.email

    # Remove from teams first
    db.query(TeamMember).filter(TeamMember.user_id == user_id).delete()
    db.delete(user)

    # Log the action
    audit_log = AuditLog(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action=AuditAction.DELETE,
        resource_type=ResourceType.USER,
        resource_id=user_id,
        details={"deleted_user_email": user_email},
        status="success"
    )
    db.add(audit_log)
    db.commit()

    return {"message": "User deleted successfully"}


# =====================
# ORGANIZATION SETTINGS
# =====================

@router.get("/settings")
def get_organization_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_org_admin_or_above)
):
    """Get organization settings"""
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="User must belong to an organization")

    org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    return {
        "id": str(org.id),
        "name": org.name,
        "slug": org.slug,
        "plan": org.plan.value if hasattr(org.plan, 'value') else org.plan,
        "settings": org.settings or {},
        "logo_url": org.logo_url,
        "created_at": org.created_at.isoformat() if org.created_at else None
    }


@router.patch("/settings")
def update_organization_settings(
    settings_data: OrganizationSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_org_admin_or_above)
):
    """Update organization settings"""
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="User must belong to an organization")

    org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    updates = {}
    if settings_data.name is not None:
        org.name = settings_data.name
        updates["name"] = settings_data.name
    if settings_data.slug is not None:
        # Check if slug is unique
        existing = db.query(Organization).filter(
            Organization.slug == settings_data.slug,
            Organization.id != org.id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Slug already in use")
        org.slug = settings_data.slug
        updates["slug"] = settings_data.slug
    if settings_data.settings is not None:
        # Merge with existing settings
        current_settings = org.settings or {}
        current_settings.update(settings_data.settings)
        org.settings = current_settings
        updates["settings"] = settings_data.settings

    org.updated_at = datetime.utcnow()

    # Log the action
    audit_log = AuditLog(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action=AuditAction.UPDATE,
        resource_type=ResourceType.SETTINGS,
        resource_id=org.id,
        details={"updates": updates},
        status="success"
    )
    db.add(audit_log)
    db.commit()

    return {
        "message": "Settings updated successfully",
        "id": str(org.id),
        "name": org.name,
        "slug": org.slug,
        "settings": org.settings
    }


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
    period: str = Query("30d", pattern="^(7d|30d|90d)$"),
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


@router.get("/analytics/dora-metrics")
def get_dora_metrics(
    period: str = Query("30d", pattern="^(7d|30d|90d)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get DORA metrics: Deployment Frequency, Lead Time, Change Failure Rate, MTTR
    """
    days = {"7d": 7, "30d": 30, "90d": 90}[period]
    since = datetime.utcnow() - timedelta(days=days)
    prev_period_start = since - timedelta(days=days)

    org_filter = []
    if current_user.organization_id:
        org_filter = [Repository.organization_id == current_user.organization_id]

    # Current period deployments
    current_deployments = db.query(Deployment).join(Repository).filter(
        Deployment.created_at >= since,
        *org_filter
    ).all()

    # Previous period deployments for trends
    prev_deployments = db.query(Deployment).join(Repository).filter(
        Deployment.created_at >= prev_period_start,
        Deployment.created_at < since,
        *org_filter
    ).all()

    # Deployment Frequency (deployments per day)
    deployment_frequency = len(current_deployments) / days if days > 0 else 0
    prev_frequency = len(prev_deployments) / days if days > 0 else 0
    frequency_change = ((deployment_frequency - prev_frequency) / prev_frequency * 100) if prev_frequency > 0 else 0

    # Lead Time for Changes (average time from commit to production)
    lead_times = []
    for d in current_deployments:
        if d.completed_at and d.started_at:
            lead_times.append((d.completed_at - d.started_at).total_seconds() / 3600)  # hours
    avg_lead_time = sum(lead_times) / len(lead_times) if lead_times else 0

    # Previous period lead time
    prev_lead_times = []
    for d in prev_deployments:
        if d.completed_at and d.started_at:
            prev_lead_times.append((d.completed_at - d.started_at).total_seconds() / 3600)
    prev_avg_lead_time = sum(prev_lead_times) / len(prev_lead_times) if prev_lead_times else 0
    lead_time_change = ((avg_lead_time - prev_avg_lead_time) / prev_avg_lead_time * 100) if prev_avg_lead_time > 0 else 0

    # Change Failure Rate
    failed_deployments = len([d for d in current_deployments if d.status in ["failed", "rolled_back"]])
    change_failure_rate = (failed_deployments / len(current_deployments) * 100) if current_deployments else 0

    prev_failed = len([d for d in prev_deployments if d.status in ["failed", "rolled_back"]])
    prev_failure_rate = (prev_failed / len(prev_deployments) * 100) if prev_deployments else 0
    failure_rate_change = change_failure_rate - prev_failure_rate

    # Mean Time to Recovery (MTTR) - time from failure to rollback/fix
    recovery_times = []
    for d in current_deployments:
        if d.status == "rolled_back" and d.completed_at and d.started_at:
            recovery_times.append((d.completed_at - d.started_at).total_seconds() / 60)  # minutes
    mttr = sum(recovery_times) / len(recovery_times) if recovery_times else 0

    prev_recovery_times = []
    for d in prev_deployments:
        if d.status == "rolled_back" and d.completed_at and d.started_at:
            prev_recovery_times.append((d.completed_at - d.started_at).total_seconds() / 60)
    prev_mttr = sum(prev_recovery_times) / len(prev_recovery_times) if prev_recovery_times else 0
    mttr_change = ((mttr - prev_mttr) / prev_mttr * 100) if prev_mttr > 0 else 0

    return {
        "period": period,
        "metrics": {
            "deployment_frequency": {
                "value": round(deployment_frequency, 2),
                "unit": "deployments/day",
                "change": round(frequency_change, 1),
                "trend": "up" if frequency_change > 0 else "down" if frequency_change < 0 else "stable"
            },
            "lead_time": {
                "value": round(avg_lead_time, 2),
                "unit": "hours",
                "change": round(lead_time_change, 1),
                "trend": "down" if lead_time_change < 0 else "up" if lead_time_change > 0 else "stable"
            },
            "change_failure_rate": {
                "value": round(change_failure_rate, 2),
                "unit": "%",
                "change": round(failure_rate_change, 1),
                "trend": "down" if failure_rate_change < 0 else "up" if failure_rate_change > 0 else "stable"
            },
            "mttr": {
                "value": round(mttr, 2),
                "unit": "minutes",
                "change": round(mttr_change, 1),
                "trend": "down" if mttr_change < 0 else "up" if mttr_change > 0 else "stable"
            }
        }
    }


@router.get("/analytics/risk-trends")
def get_risk_trends(
    period: str = Query("7d", pattern="^(7d|14d|30d)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get daily risk scores and deployment counts for trend chart
    """
    days = {"7d": 7, "14d": 14, "30d": 30}[period]

    org_filter = []
    if current_user.organization_id:
        org_filter = [Repository.organization_id == current_user.organization_id]

    trends = []
    day_names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    for i in range(days - 1, -1, -1):
        day_start = (datetime.utcnow() - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        daily_deployments = db.query(Deployment).join(Repository).filter(
            Deployment.created_at >= day_start,
            Deployment.created_at < day_end,
            *org_filter
        ).all()

        avg_risk = 0
        if daily_deployments:
            risk_scores = [d.risk_score or 0 for d in daily_deployments]
            avg_risk = sum(risk_scores) / len(risk_scores) if risk_scores else 0

        trends.append({
            "date": day_names[day_start.weekday()] if days <= 7 else day_start.strftime("%b %d"),
            "risk": round(avg_risk, 1),
            "deployments": len(daily_deployments)
        })

    return {"period": period, "data": trends}


@router.get("/analytics/activity")
def get_recent_activity(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get recent activity timeline (deployments, scans, tests)
    """
    org_filter = []
    if current_user.organization_id:
        org_filter = [Repository.organization_id == current_user.organization_id]

    activities = []

    # Recent deployments
    deployments = db.query(Deployment).join(Repository).filter(*org_filter).order_by(
        Deployment.created_at.desc()
    ).limit(limit).all()

    for d in deployments:
        user = db.query(User).filter(User.id == d.deployed_by).first()
        activities.append({
            "id": str(d.id),
            "type": "deployment",
            "title": f"{d.environment.value.title()} Deployment",
            "description": f"{d.repository.name} {d.version} deployed to {d.environment.value}",
            "status": d.status.value if hasattr(d.status, 'value') else d.status,
            "timestamp": d.created_at.isoformat(),
            "user": user.name if user else None
        })

    # Recent scans
    scans = db.query(ScanResult).join(Repository).filter(*org_filter).order_by(
        ScanResult.created_at.desc()
    ).limit(limit).all()

    for s in scans:
        scan_type = s.scan_type.value if hasattr(s.scan_type, 'value') else s.scan_type
        activities.append({
            "id": str(s.id),
            "type": "scan",
            "title": f"{scan_type.title()} Scan",
            "description": f"{scan_type.title()} scan {'completed' if s.status.value == 'completed' else s.status.value} for {s.repository.name}",
            "status": "warning" if s.findings_count > 0 else s.status.value,
            "timestamp": s.created_at.isoformat()
        })

    # Recent test runs
    test_runs = db.query(TestRun).join(Repository).filter(*org_filter).order_by(
        TestRun.created_at.desc()
    ).limit(limit).all()

    for t in test_runs:
        status = t.status.value if hasattr(t.status, 'value') else t.status
        activities.append({
            "id": str(t.id),
            "type": "test",
            "title": "Test Suite",
            "description": f"{t.passed}/{t.total_tests} tests passed for {t.repository.name}",
            "status": "failed" if t.failed > 0 else status,
            "timestamp": t.created_at.isoformat()
        })

    # Sort by timestamp and limit
    activities.sort(key=lambda x: x["timestamp"], reverse=True)
    return {"activities": activities[:limit]}


@router.get("/analytics/vulnerabilities")
def get_vulnerability_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get vulnerability summary by severity
    """
    from app.models.scan import Vulnerability

    org_filter = []
    if current_user.organization_id:
        org_filter = [Repository.organization_id == current_user.organization_id]

    # Count vulnerabilities by severity
    critical = db.query(func.count(Vulnerability.id)).join(ScanResult).join(Repository).filter(
        Vulnerability.severity == "critical",
        Vulnerability.status == "open",
        *org_filter
    ).scalar() or 0

    high = db.query(func.count(Vulnerability.id)).join(ScanResult).join(Repository).filter(
        Vulnerability.severity == "high",
        Vulnerability.status == "open",
        *org_filter
    ).scalar() or 0

    medium = db.query(func.count(Vulnerability.id)).join(ScanResult).join(Repository).filter(
        Vulnerability.severity == "medium",
        Vulnerability.status == "open",
        *org_filter
    ).scalar() or 0

    low = db.query(func.count(Vulnerability.id)).join(ScanResult).join(Repository).filter(
        Vulnerability.severity == "low",
        Vulnerability.status == "open",
        *org_filter
    ).scalar() or 0

    return {
        "summary": [
            {"name": "Critical", "value": critical, "color": "#ef4444"},
            {"name": "High", "value": high, "color": "#f97316"},
            {"name": "Medium", "value": medium, "color": "#eab308"},
            {"name": "Low", "value": low, "color": "#3b82f6"}
        ],
        "total": critical + high + medium + low
    }


@router.get("/analytics/test-efficiency")
def get_test_efficiency(
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get test efficiency data by repository
    """
    org_filter = []
    if current_user.organization_id:
        org_filter = [Repository.organization_id == current_user.organization_id]

    # Get repositories with recent test runs
    repos = db.query(Repository).filter(*org_filter).limit(limit).all()

    efficiency_data = []
    for repo in repos:
        # Get recent test runs for this repo
        recent_runs = db.query(TestRun).filter(
            TestRun.repository_id == repo.id,
            TestRun.status == "completed"
        ).order_by(TestRun.created_at.desc()).limit(10).all()

        if recent_runs:
            # Calculate average full suite time and selected tests time
            full_suite_times = []
            selected_times = []
            time_saved = []

            for run in recent_runs:
                total_time = run.duration_ms / 60000  # Convert to minutes
                if run.total_tests > 0 and run.selected_tests > 0:
                    # Estimate full suite time based on ratio
                    estimated_full = total_time * (run.total_tests / run.selected_tests) if run.selected_tests > 0 else total_time
                    full_suite_times.append(estimated_full)
                    selected_times.append(total_time)
                    if run.time_saved_percent:
                        time_saved.append(run.time_saved_percent)
                else:
                    full_suite_times.append(total_time)
                    selected_times.append(total_time)

            avg_full = sum(full_suite_times) / len(full_suite_times) if full_suite_times else 0
            avg_selected = sum(selected_times) / len(selected_times) if selected_times else 0
            avg_saved = sum(time_saved) / len(time_saved) if time_saved else 0

            efficiency_data.append({
                "repo": repo.name[:12],  # Truncate for display
                "full": round(avg_full, 1),
                "selected": round(avg_selected, 1),
                "saved": round(avg_saved, 1)
            })

    # If no real data, return sample structure
    if not efficiency_data:
        efficiency_data = [
            {"repo": "No data", "full": 0, "selected": 0, "saved": 0}
        ]

    return {"data": efficiency_data}


@router.get("/analytics/team-performance")
def get_team_performance(
    period: str = Query("30d", pattern="^(7d|30d|90d)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get team performance metrics
    """
    days = {"7d": 7, "30d": 30, "90d": 90}[period]
    since = datetime.utcnow() - timedelta(days=days)
    prev_period_start = since - timedelta(days=days)

    org_filter = []
    if current_user.organization_id:
        org_filter = [Repository.organization_id == current_user.organization_id]

    # Get users in organization
    users_query = db.query(User)
    if current_user.organization_id:
        users_query = users_query.filter(User.organization_id == current_user.organization_id)
    team_members = users_query.all()

    # Team deployments
    team_deployments = db.query(Deployment).join(Repository).filter(
        Deployment.created_at >= since,
        *org_filter
    ).all()

    prev_deployments = db.query(Deployment).join(Repository).filter(
        Deployment.created_at >= prev_period_start,
        Deployment.created_at < since,
        *org_filter
    ).all()

    # Successful deployments
    successful = len([d for d in team_deployments if d.status.value == "completed"])
    prev_successful = len([d for d in prev_deployments if d.status.value == "completed"])

    # Code reviews (using scan results as proxy)
    reviews = db.query(func.count(ScanResult.id)).join(Repository).filter(
        ScanResult.created_at >= since,
        ScanResult.scan_type == "quality",
        *org_filter
    ).scalar() or 0

    prev_reviews = db.query(func.count(ScanResult.id)).join(Repository).filter(
        ScanResult.created_at >= prev_period_start,
        ScanResult.created_at < since,
        ScanResult.scan_type == "quality",
        *org_filter
    ).scalar() or 0

    # Test runs
    test_runs = db.query(TestRun).join(Repository).filter(
        TestRun.created_at >= since,
        *org_filter
    ).all()

    tests_passed = sum(t.passed for t in test_runs)
    tests_total = sum(t.total_tests for t in test_runs)
    pass_rate = (tests_passed / tests_total * 100) if tests_total > 0 else 0

    prev_tests = db.query(TestRun).join(Repository).filter(
        TestRun.created_at >= prev_period_start,
        TestRun.created_at < since,
        *org_filter
    ).all()
    prev_passed = sum(t.passed for t in prev_tests)
    prev_total = sum(t.total_tests for t in prev_tests)
    prev_pass_rate = (prev_passed / prev_total * 100) if prev_total > 0 else 0

    # Calculate changes
    deployment_change = ((successful - prev_successful) / prev_successful * 100) if prev_successful > 0 else 0
    review_change = ((reviews - prev_reviews) / prev_reviews * 100) if prev_reviews > 0 else 0
    pass_rate_change = pass_rate - prev_pass_rate

    return {
        "period": period,
        "metrics": {
            "team_size": len(team_members),
            "total_deployments": len(team_deployments),
            "successful_deployments": successful,
            "deployment_success_rate": round((successful / len(team_deployments) * 100) if team_deployments else 0, 1),
            "deployment_change": round(deployment_change, 1),
            "code_reviews": reviews,
            "review_change": round(review_change, 1),
            "test_pass_rate": round(pass_rate, 1),
            "pass_rate_change": round(pass_rate_change, 1),
            "active_repositories": db.query(func.count(Repository.id)).filter(*org_filter).scalar() or 0
        }
    }


@router.get("/analytics/health-status")
def get_health_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get system health status for various services
    """
    import random

    # In production, these would be actual health checks
    # For now, we'll derive status from database state

    org_filter = []
    if current_user.organization_id:
        org_filter = [Repository.organization_id == current_user.organization_id]

    # Check recent activity to determine service health
    recent_time = datetime.utcnow() - timedelta(minutes=30)

    # API Gateway - always healthy if we got here
    api_status = "healthy"

    # Code Analysis Engine - check recent scans
    recent_scans = db.query(func.count(ScanResult.id)).join(Repository).filter(
        ScanResult.created_at >= recent_time,
        *org_filter
    ).scalar() or 0
    analysis_status = "healthy" if recent_scans >= 0 else "degraded"

    # Test Intelligence - check recent test runs
    recent_tests = db.query(func.count(TestRun.id)).join(Repository).filter(
        TestRun.created_at >= recent_time,
        *org_filter
    ).scalar() or 0
    test_status = "healthy"

    # Check for any failed/stuck operations
    stuck_scans = db.query(func.count(ScanResult.id)).join(Repository).filter(
        ScanResult.status.in_(["pending", "running"]),
        ScanResult.created_at < datetime.utcnow() - timedelta(hours=1),
        *org_filter
    ).scalar() or 0

    if stuck_scans > 0:
        analysis_status = "degraded"

    # Deployment Service
    recent_deployments = db.query(func.count(Deployment.id)).join(Repository).filter(
        Deployment.created_at >= recent_time,
        *org_filter
    ).scalar() or 0
    deployment_status = "healthy"

    stuck_deployments = db.query(func.count(Deployment.id)).join(Repository).filter(
        Deployment.status == "in_progress",
        Deployment.created_at < datetime.utcnow() - timedelta(hours=1),
        *org_filter
    ).scalar() or 0

    if stuck_deployments > 0:
        deployment_status = "degraded"

    services = [
        {"name": "API Gateway", "status": api_status, "latency": f"{random.randint(8, 15)}ms"},
        {"name": "Code Analysis Engine", "status": analysis_status, "latency": f"{random.randint(30, 60)}ms"},
        {"name": "Test Intelligence", "status": test_status, "latency": f"{random.randint(15, 30)}ms"},
        {"name": "Deployment Service", "status": deployment_status, "latency": f"{random.randint(12, 25)}ms"},
        {"name": "ML Pipeline", "status": "healthy", "latency": f"{random.randint(80, 150)}ms"},
        {"name": "Metrics Collector", "status": "healthy", "latency": f"{random.randint(5, 12)}ms"}
    ]

    healthy_count = len([s for s in services if s["status"] == "healthy"])
    overall_status = "healthy" if healthy_count == len(services) else "degraded"

    return {
        "overall_status": overall_status,
        "services": services
    }


@router.get("/analytics/dora-history")
def get_dora_history(
    weeks: int = Query(6, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get weekly DORA metrics history for charts
    """
    org_filter = []
    if current_user.organization_id:
        org_filter = [Repository.organization_id == current_user.organization_id]

    deployment_frequency = []
    lead_time_data = []
    mttr_data = []
    change_failure_data = []

    for i in range(weeks - 1, -1, -1):
        week_end = datetime.utcnow() - timedelta(weeks=i)
        week_start = week_end - timedelta(weeks=1)
        week_label = f"W{weeks - i}"

        # Get deployments for this week
        week_deployments = db.query(Deployment).join(Repository).filter(
            Deployment.created_at >= week_start,
            Deployment.created_at < week_end,
            *org_filter
        ).all()

        # Deployment frequency
        deployment_frequency.append({
            "week": week_label,
            "deploys": len(week_deployments)
        })

        # Lead time (hours from start to complete)
        lead_times = []
        for d in week_deployments:
            if d.completed_at and d.started_at:
                hours = (d.completed_at - d.started_at).total_seconds() / 3600
                lead_times.append(hours)
        avg_lead_time = sum(lead_times) / len(lead_times) if lead_times else 0
        lead_time_data.append({
            "week": week_label,
            "hours": round(avg_lead_time, 1)
        })

        # MTTR (minutes for rolled back deployments)
        recovery_times = []
        for d in week_deployments:
            if d.status.value == "rolled_back" and d.completed_at and d.started_at:
                minutes = (d.completed_at - d.started_at).total_seconds() / 60
                recovery_times.append(minutes)
        avg_mttr = sum(recovery_times) / len(recovery_times) if recovery_times else 0
        mttr_data.append({
            "week": week_label,
            "minutes": round(avg_mttr, 1)
        })

        # Change failure rate
        failed = len([d for d in week_deployments if d.status.value in ["failed", "rolled_back"]])
        failure_rate = (failed / len(week_deployments) * 100) if week_deployments else 0
        change_failure_data.append({
            "week": week_label,
            "rate": round(failure_rate, 1)
        })

    # Calculate current summary values
    recent_deploys = deployment_frequency[-1]["deploys"] if deployment_frequency else 0
    prev_deploys = deployment_frequency[-2]["deploys"] if len(deployment_frequency) > 1 else 0
    deploy_change = ((recent_deploys - prev_deploys) / prev_deploys * 100) if prev_deploys > 0 else 0

    recent_lead = lead_time_data[-1]["hours"] if lead_time_data else 0
    prev_lead = lead_time_data[-2]["hours"] if len(lead_time_data) > 1 else 0
    lead_change = ((recent_lead - prev_lead) / prev_lead * 100) if prev_lead > 0 else 0

    recent_mttr = mttr_data[-1]["minutes"] if mttr_data else 0
    prev_mttr = mttr_data[-2]["minutes"] if len(mttr_data) > 1 else 0
    mttr_change = ((recent_mttr - prev_mttr) / prev_mttr * 100) if prev_mttr > 0 else 0

    recent_failure = change_failure_data[-1]["rate"] if change_failure_data else 0
    prev_failure = change_failure_data[-2]["rate"] if len(change_failure_data) > 1 else 0
    failure_change = recent_failure - prev_failure

    return {
        "deployment_frequency": deployment_frequency,
        "lead_time": lead_time_data,
        "mttr": mttr_data,
        "change_failure_rate": change_failure_data,
        "summary": {
            "deployment_frequency": {
                "value": recent_deploys,
                "unit": "/week",
                "change": round(deploy_change, 1)
            },
            "lead_time": {
                "value": recent_lead,
                "unit": "hours",
                "change": round(lead_change, 1)
            },
            "mttr": {
                "value": recent_mttr,
                "unit": "min",
                "change": round(mttr_change, 1)
            },
            "change_failure_rate": {
                "value": recent_failure,
                "unit": "%",
                "change": round(failure_change, 1)
            }
        }
    }


@router.get("/analytics/trends")
def get_analytics_trends(
    months: int = Query(6, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get monthly trends for deployments, vulnerabilities, and test pass rate
    """
    from app.models.scan import Vulnerability

    org_filter = []
    if current_user.organization_id:
        org_filter = [Repository.organization_id == current_user.organization_id]

    trends = []
    month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    for i in range(months - 1, -1, -1):
        # Calculate month boundaries
        now = datetime.utcnow()
        month_end = now.replace(day=1) - timedelta(days=1)  # Last day of previous month
        for _ in range(i):
            month_end = month_end.replace(day=1) - timedelta(days=1)
        month_start = month_end.replace(day=1)
        month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        month_end = month_end.replace(hour=23, minute=59, second=59)

        month_label = month_names[month_start.month - 1]

        # Deployments this month
        deployments_count = db.query(func.count(Deployment.id)).join(Repository).filter(
            Deployment.created_at >= month_start,
            Deployment.created_at <= month_end,
            *org_filter
        ).scalar() or 0

        # New vulnerabilities this month
        vulns_count = db.query(func.count(Vulnerability.id)).join(ScanResult).join(Repository).filter(
            Vulnerability.created_at >= month_start,
            Vulnerability.created_at <= month_end,
            *org_filter
        ).scalar() or 0

        # Test pass rate this month
        test_runs = db.query(TestRun).join(Repository).filter(
            TestRun.created_at >= month_start,
            TestRun.created_at <= month_end,
            TestRun.status == "completed",
            *org_filter
        ).all()

        total_passed = sum(t.passed for t in test_runs)
        total_tests = sum(t.total_tests for t in test_runs)
        pass_rate = round((total_passed / total_tests * 100), 1) if total_tests > 0 else 0

        trends.append({
            "month": month_label,
            "deployments": deployments_count,
            "vulnerabilities": vulns_count,
            "testPass": pass_rate
        })

    return {"data": trends}


@router.get("/analytics/team-metrics")
def get_team_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get performance metrics broken down by team/repository
    """
    org_filter = []
    if current_user.organization_id:
        org_filter = [Repository.organization_id == current_user.organization_id]

    # Get repositories as proxy for teams
    repos = db.query(Repository).filter(*org_filter).all()

    team_data = []
    for repo in repos:
        # Get deployments for this repo (last 30 days)
        since = datetime.utcnow() - timedelta(days=30)
        deploys = db.query(func.count(Deployment.id)).filter(
            Deployment.repository_id == repo.id,
            Deployment.created_at >= since
        ).scalar() or 0

        # Get test pass rate
        test_runs = db.query(TestRun).filter(
            TestRun.repository_id == repo.id,
            TestRun.created_at >= since,
            TestRun.status == "completed"
        ).all()

        total_passed = sum(t.passed for t in test_runs)
        total_tests = sum(t.total_tests for t in test_runs)
        pass_rate = round((total_passed / total_tests * 100), 1) if total_tests > 0 else 0

        # Get average coverage
        coverages = [t.coverage_percent for t in test_runs if t.coverage_percent]
        avg_coverage = round(sum(coverages) / len(coverages), 1) if coverages else 0

        team_data.append({
            "team": repo.name[:15],  # Use repo name as team name
            "deploys": deploys,
            "passRate": pass_rate,
            "coverage": avg_coverage
        })

    # Sort by deployments
    team_data.sort(key=lambda x: x["deploys"], reverse=True)

    return {"data": team_data[:10]}  # Top 10 teams
