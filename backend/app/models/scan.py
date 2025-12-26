from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum, JSON, Integer
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.core.database import Base, GUID


class ScanType(str, enum.Enum):
    SECURITY = "security"
    QUALITY = "quality"
    DEPENDENCY = "dependency"


class ScanStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class VulnerabilitySeverity(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class VulnerabilityStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    IGNORED = "ignored"


class ScanResult(Base):
    __tablename__ = "scan_results"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    repository_id = Column(GUID(), ForeignKey("repositories.id"), nullable=False)
    commit_sha = Column(String(40), nullable=False)
    branch = Column(String(255), nullable=True)
    scan_type = Column(SQLEnum(ScanType), nullable=False)
    status = Column(SQLEnum(ScanStatus), default=ScanStatus.PENDING)
    findings_count = Column(Integer, default=0)
    critical_count = Column(Integer, default=0)
    high_count = Column(Integer, default=0)
    medium_count = Column(Integer, default=0)
    low_count = Column(Integer, default=0)
    metrics = Column(JSON, default=dict)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    repository = relationship("Repository", back_populates="scans")
    vulnerabilities = relationship("Vulnerability", back_populates="scan")


class Vulnerability(Base):
    __tablename__ = "vulnerabilities"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    scan_id = Column(GUID(), ForeignKey("scan_results.id"), nullable=False)
    severity = Column(SQLEnum(VulnerabilitySeverity), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(String(2000), nullable=True)
    file_path = Column(String(500), nullable=True)
    line_number = Column(Integer, nullable=True)
    cwe_id = Column(String(50), nullable=True)
    cvss_score = Column(String(10), nullable=True)
    status = Column(SQLEnum(VulnerabilityStatus), default=VulnerabilityStatus.OPEN)
    recommendation = Column(String(1000), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    scan = relationship("ScanResult", back_populates="vulnerabilities")
