from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.core.database import Base, GUID


class AuditAction(str, enum.Enum):
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    LOGIN = "login"
    LOGOUT = "logout"
    DEPLOY = "deploy"
    ROLLBACK = "rollback"
    SCAN = "scan"
    APPROVE = "approve"
    REJECT = "reject"


class ResourceType(str, enum.Enum):
    USER = "user"
    ORGANIZATION = "organization"
    TEAM = "team"
    REPOSITORY = "repository"
    DEPLOYMENT = "deployment"
    SCAN = "scan"
    RULE = "rule"
    SETTINGS = "settings"
    INTEGRATION = "integration"


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID(), ForeignKey("organizations.id"), nullable=True)
    user_id = Column(GUID(), ForeignKey("users.id"), nullable=True)
    action = Column(SQLEnum(AuditAction), nullable=False)
    resource_type = Column(SQLEnum(ResourceType), nullable=False)
    resource_id = Column(GUID(), nullable=True)
    details = Column(JSON, default=dict)
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(500), nullable=True)
    status = Column(String(50), default="success")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    organization = relationship("Organization", back_populates="audit_logs")
    user = relationship("User", back_populates="audit_logs")
