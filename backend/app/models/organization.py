from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.core.database import Base, GUID


class PlanType(str, enum.Enum):
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    plan = Column(SQLEnum(PlanType), default=PlanType.STARTER, nullable=False)
    settings = Column(JSON, default=dict)
    logo_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    users = relationship("User", back_populates="organization")
    teams = relationship("Team", back_populates="organization")
    repositories = relationship("Repository", back_populates="organization")
    architecture_rules = relationship("ArchitectureRule", back_populates="organization")
    audit_logs = relationship("AuditLog", back_populates="organization")


class TeamRole(str, enum.Enum):
    LEAD = "lead"
    MEMBER = "member"


class Team(Base):
    __tablename__ = "teams"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(String(500), nullable=True)
    organization_id = Column(GUID(), ForeignKey("organizations.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    organization = relationship("Organization", back_populates="teams")
    members = relationship("TeamMember", back_populates="team")


class TeamMember(Base):
    __tablename__ = "team_members"

    user_id = Column(GUID(), ForeignKey("users.id"), primary_key=True)
    team_id = Column(GUID(), ForeignKey("teams.id"), primary_key=True)
    role = Column(SQLEnum(TeamRole), default=TeamRole.MEMBER, nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="team_memberships")
    team = relationship("Team", back_populates="members")
