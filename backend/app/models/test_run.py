from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum, JSON, Float, Integer
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.core.database import Base, GUID


class TestRunStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class FlakyTestStatus(str, enum.Enum):
    ACTIVE = "active"
    QUARANTINED = "quarantined"
    RESOLVED = "resolved"


class TestRun(Base):
    __tablename__ = "test_runs"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    repository_id = Column(GUID(), ForeignKey("repositories.id"), nullable=False)
    commit_sha = Column(String(40), nullable=False)
    branch = Column(String(255), nullable=True)
    status = Column(SQLEnum(TestRunStatus), default=TestRunStatus.PENDING)
    total_tests = Column(Integer, default=0)
    selected_tests = Column(Integer, default=0)
    passed = Column(Integer, default=0)
    failed = Column(Integer, default=0)
    skipped = Column(Integer, default=0)
    duration_ms = Column(Integer, default=0)
    coverage_percent = Column(Float, nullable=True)
    selection_accuracy = Column(Float, nullable=True)
    time_saved_percent = Column(Float, nullable=True)
    test_framework = Column(String(50), nullable=True)
    triggered_by = Column(String(50), nullable=True)
    run_metadata = Column(JSON, default=dict)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    repository = relationship("Repository", back_populates="test_runs")


class FlakyTest(Base):
    __tablename__ = "flaky_tests"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    repository_id = Column(GUID(), ForeignKey("repositories.id"), nullable=False)
    test_name = Column(String(500), nullable=False)
    test_file = Column(String(500), nullable=True)
    test_suite = Column(String(255), nullable=True)
    flakiness_score = Column(Float, default=0.0)
    total_runs = Column(Integer, default=0)
    failure_count = Column(Integer, default=0)
    last_failure = Column(DateTime, nullable=True)
    last_success = Column(DateTime, nullable=True)
    status = Column(SQLEnum(FlakyTestStatus), default=FlakyTestStatus.ACTIVE)
    root_cause = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    repository = relationship("Repository", back_populates="flaky_tests")
