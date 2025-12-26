from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum, JSON, Float, Integer
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.core.database import Base, GUID


class DeploymentStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"


class DeploymentStrategy(str, enum.Enum):
    ROLLING = "rolling"
    CANARY = "canary"
    BLUE_GREEN = "blue_green"
    RECREATE = "recreate"


class Environment(str, enum.Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


class Deployment(Base):
    __tablename__ = "deployments"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    repository_id = Column(GUID(), ForeignKey("repositories.id"), nullable=False)
    environment = Column(SQLEnum(Environment), nullable=False)
    version = Column(String(100), nullable=False)
    commit_sha = Column(String(40), nullable=False)
    branch = Column(String(255), nullable=True)
    risk_score = Column(Float, default=0.0)
    risk_factors = Column(JSON, default=dict)
    status = Column(SQLEnum(DeploymentStatus), default=DeploymentStatus.PENDING)
    strategy = Column(SQLEnum(DeploymentStrategy), default=DeploymentStrategy.ROLLING)
    deployed_by = Column(GUID(), ForeignKey("users.id"), nullable=False)
    rollback_from = Column(GUID(), nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    impact_metrics = Column(JSON, default=dict)
    notes = Column(String(1000), nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    repository = relationship("Repository", back_populates="deployments")
    deployed_by_user = relationship("User", back_populates="deployments")
    metrics = relationship("DeploymentMetric", back_populates="deployment")


class DeploymentMetric(Base):
    __tablename__ = "deployment_metrics"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    deployment_id = Column(GUID(), ForeignKey("deployments.id"), nullable=False)
    metric_name = Column(String(100), nullable=False)
    metric_type = Column(String(50), nullable=False)
    before_value = Column(Float, nullable=True)
    after_value = Column(Float, nullable=True)
    change_percent = Column(Float, nullable=True)
    threshold = Column(Float, nullable=True)
    is_anomaly = Column(String(10), default="no")
    recorded_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    deployment = relationship("Deployment", back_populates="metrics")
