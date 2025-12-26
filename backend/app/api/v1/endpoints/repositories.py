from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
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
    repo = Repository(**repo_data.model_dump())
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
