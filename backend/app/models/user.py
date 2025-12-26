from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.core.database import Base, GUID


class UserRole(str, enum.Enum):
    PLATFORM_ADMIN = "platform_admin"
    ORG_ADMIN = "org_admin"
    TEAM_LEAD = "team_lead"
    DEVELOPER = "developer"
    VIEWER = "viewer"


class User(Base):
    __tablename__ = "users"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.DEVELOPER, nullable=False)
    organization_id = Column(GUID(), ForeignKey("organizations.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    avatar_url = Column(String(500), nullable=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    organization = relationship("Organization", back_populates="users")
    team_memberships = relationship("TeamMember", back_populates="user")
    deployments = relationship("Deployment", back_populates="deployed_by_user")
    audit_logs = relationship("AuditLog", back_populates="user")
