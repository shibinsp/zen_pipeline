from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.core.database import Base, GUID


class RepositoryProvider(str, enum.Enum):
    GITHUB = "github"
    GITLAB = "gitlab"
    BITBUCKET = "bitbucket"
    AZURE_DEVOPS = "azure_devops"


class Repository(Base):
    __tablename__ = "repositories"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID(), ForeignKey("organizations.id"), nullable=False)
    name = Column(String(255), nullable=False)
    full_name = Column(String(500), nullable=False)
    provider = Column(SQLEnum(RepositoryProvider), nullable=False)
    url = Column(String(500), nullable=False)
    default_branch = Column(String(255), default="main")
    language_breakdown = Column(JSON, default=dict)
    settings = Column(JSON, default=dict)
    health_score = Column(String(10), default="A")
    last_scan_at = Column(DateTime, nullable=True)
    last_review_data = Column(JSON, nullable=True)  # Stores the latest code review results
    dependency_graph = Column(JSON, nullable=True)  # Stores analyzed dependency graph
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    organization = relationship("Organization", back_populates="repositories")
    scans = relationship("ScanResult", back_populates="repository")
    deployments = relationship("Deployment", back_populates="repository")
    test_runs = relationship("TestRun", back_populates="repository")
    flaky_tests = relationship("FlakyTest", back_populates="repository")
    dependency_violations = relationship("DependencyViolation", back_populates="repository")
