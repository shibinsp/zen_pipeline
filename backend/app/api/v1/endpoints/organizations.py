from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.api.deps import get_db, get_current_user, get_platform_admin
from app.models.user import User
from app.models.organization import Organization, Team, TeamMember
from app.schemas.organization import OrganizationCreate, OrganizationUpdate, OrganizationResponse
from app.schemas.team import TeamCreate, TeamUpdate, TeamResponse, TeamMemberAdd
from app.schemas.common import PaginatedResponse

router = APIRouter()


@router.get("", response_model=PaginatedResponse[OrganizationResponse])
def list_organizations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_platform_admin)
):
    query = db.query(Organization)

    if search:
        query = query.filter(Organization.name.ilike(f"%{search}%"))

    total = query.count()
    orgs = query.offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(
        items=orgs,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/{org_id}", response_model=OrganizationResponse)
def get_organization(
    org_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Check access
    if current_user.role != "platform_admin" and current_user.organization_id != org_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return org


@router.post("", response_model=OrganizationResponse)
def create_organization(
    org_data: OrganizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_platform_admin)
):
    # Check if slug exists
    existing = db.query(Organization).filter(Organization.slug == org_data.slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="Slug already exists")

    org = Organization(**org_data.model_dump())
    db.add(org)
    db.commit()
    db.refresh(org)

    return org


@router.patch("/{org_id}", response_model=OrganizationResponse)
def update_organization(
    org_id: UUID,
    org_data: OrganizationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Check permissions
    if current_user.role not in ["platform_admin", "org_admin"]:
        raise HTTPException(status_code=403, detail="Access denied")

    update_data = org_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(org, field, value)

    db.commit()
    db.refresh(org)

    return org


# Teams endpoints
@router.get("/{org_id}/teams", response_model=List[TeamResponse])
def list_teams(
    org_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    teams = db.query(Team).filter(Team.organization_id == org_id).all()
    return teams


@router.post("/{org_id}/teams", response_model=TeamResponse)
def create_team(
    org_id: UUID,
    team_data: TeamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    team = Team(
        name=team_data.name,
        description=team_data.description,
        organization_id=org_id
    )
    db.add(team)
    db.commit()
    db.refresh(team)

    return team


@router.post("/{org_id}/teams/{team_id}/members")
def add_team_member(
    org_id: UUID,
    team_id: UUID,
    member_data: TeamMemberAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify team exists
    team = db.query(Team).filter(Team.id == team_id, Team.organization_id == org_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Add member
    member = TeamMember(
        user_id=member_data.user_id,
        team_id=team_id,
        role=member_data.role
    )
    db.add(member)
    db.commit()

    return {"message": "Member added successfully"}


@router.delete("/{org_id}/teams/{team_id}/members/{user_id}")
def remove_team_member(
    org_id: UUID,
    team_id: UUID,
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    member = db.query(TeamMember).filter(
        TeamMember.team_id == team_id,
        TeamMember.user_id == user_id
    ).first()

    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    db.delete(member)
    db.commit()

    return {"message": "Member removed successfully"}
