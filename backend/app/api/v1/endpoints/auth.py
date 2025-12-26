from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from app.api.deps import get_db, get_current_user
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, verify_token
from app.models.user import User
from app.models.audit_log import AuditLog, AuditAction, ResourceType
from app.schemas.user import UserLogin, UserResponse, UserCreate
from app.schemas.auth import Token, TokenRefresh
import traceback

router = APIRouter()


@router.post("/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    try:
        print(f"Login attempt for: {user_data.email}")
        user = db.query(User).filter(User.email == user_data.email).first()

        if not user or not verify_password(user_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is disabled"
            )

        # Update last login
        user.last_login = datetime.utcnow()

        # Create audit log
        audit_log = AuditLog(
            organization_id=user.organization_id,
            user_id=user.id,
            action=AuditAction.LOGIN,
            resource_type=ResourceType.USER,
            resource_id=user.id,
            details={"email": user.email}
        )
        db.add(audit_log)
        db.commit()

        print(f"Login successful for: {user.email}")
        return Token(
            access_token=create_access_token(str(user.id)),
            refresh_token=create_refresh_token(str(user.id))
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/register", response_model=UserResponse)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if email exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create user
    user = User(
        email=user_data.email,
        name=user_data.name,
        password_hash=get_password_hash(user_data.password),
        role=user_data.role,
        organization_id=user_data.organization_id
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return user


@router.post("/refresh", response_model=Token)
def refresh_token(token_data: TokenRefresh, db: Session = Depends(get_db)):
    payload = verify_token(token_data.refresh_token, "refresh")

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    user = db.query(User).filter(User.id == payload.sub).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    return Token(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id))
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Create audit log
    audit_log = AuditLog(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        action=AuditAction.LOGOUT,
        resource_type=ResourceType.USER,
        resource_id=current_user.id
    )
    db.add(audit_log)
    db.commit()

    return {"message": "Logged out successfully"}
