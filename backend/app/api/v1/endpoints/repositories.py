from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.repository import Repository
from app.schemas.repository import RepositoryCreate, RepositoryUpdate, RepositoryResponse
from app.schemas.common import PaginatedResponse

router = APIRouter()


@router.get("", response_model=PaginatedResponse[RepositoryResponse])
def list_repositories(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    provider: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Repository)

    # Filter by organization
    if current_user.organization_id:
        query = query.filter(Repository.organization_id == current_user.organization_id)

    if search:
        query = query.filter(
            (Repository.name.ilike(f"%{search}%")) |
            (Repository.full_name.ilike(f"%{search}%"))
        )

    if provider:
        query = query.filter(Repository.provider == provider)

    total = query.count()
    repos = query.order_by(Repository.updated_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(
        items=repos,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/{repo_id}", response_model=RepositoryResponse)
def get_repository(
    repo_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    return repo


@router.post("", response_model=RepositoryResponse)
def create_repository(
    repo_data: RepositoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo_dict = repo_data.model_dump()

    # Auto-assign organization_id from current user if not provided
    org_id = repo_dict.get('organization_id') or current_user.organization_id
    repo_dict['organization_id'] = org_id

    # Check if repository already exists (by URL or full_name in same org)
    existing = db.query(Repository).filter(
        Repository.organization_id == org_id,
        (Repository.url == repo_dict['url']) | (Repository.full_name == repo_dict['full_name'])
    ).first()

    if existing:
        # Return existing repository instead of creating duplicate
        return existing

    # Set default values explicitly
    if not repo_dict.get('default_branch'):
        repo_dict['default_branch'] = 'main'
    if not repo_dict.get('settings'):
        repo_dict['settings'] = {}
    if not repo_dict.get('language_breakdown'):
        repo_dict['language_breakdown'] = {}
    if not repo_dict.get('health_score'):
        repo_dict['health_score'] = 'A'

    repo = Repository(**repo_dict)
    db.add(repo)
    db.commit()
    db.refresh(repo)

    return repo


@router.patch("/{repo_id}", response_model=RepositoryResponse)
def update_repository(
    repo_id: UUID,
    repo_data: RepositoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    update_data = repo_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(repo, field, value)

    db.commit()
    db.refresh(repo)

    return repo


@router.delete("/{repo_id}")
def delete_repository(
    repo_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    db.delete(repo)
    db.commit()

    return {"message": "Repository deleted successfully"}


@router.put("/{repo_id}/review", response_model=RepositoryResponse)
def save_review_results(
    repo_id: UUID,
    review_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Save code review results to a repository"""
    repo = db.query(Repository).filter(Repository.id == repo_id).first()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    # Update repository with review data
    repo.last_review_data = review_data
    repo.last_scan_at = datetime.utcnow()

    # Update health score based on review metrics
    if review_data.get('metrics'):
        security_score = review_data['metrics'].get('security_score', 0)
        quality_score = review_data['metrics'].get('quality_score', 0)
        avg_score = (security_score + quality_score) / 2
        if avg_score >= 80:
            repo.health_score = 'A'
        elif avg_score >= 60:
            repo.health_score = 'B'
        elif avg_score >= 40:
            repo.health_score = 'C'
        elif avg_score >= 20:
            repo.health_score = 'D'
        else:
            repo.health_score = 'F'

    # Update language breakdown if available
    if review_data.get('languages'):
        total_lines = review_data.get('total_lines', 1)
        repo.language_breakdown = {
            lang: round((lines / total_lines) * 100, 1)
            for lang, lines in review_data['languages'].items()
        }

    db.commit()
    db.refresh(repo)

    return repo
