from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum, JSON, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.core.database import Base, GUID


class RuleType(str, enum.Enum):
    DEPENDENCY = "dependency"
    NAMING = "naming"
    STRUCTURE = "structure"
    IMPORT = "import"
    LAYER = "layer"


class RuleSeverity(str, enum.Enum):
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


class ViolationType(str, enum.Enum):
    CIRCULAR_DEPENDENCY = "circular_dependency"
    LAYER_VIOLATION = "layer_violation"
    FORBIDDEN_IMPORT = "forbidden_import"
    NAMING_VIOLATION = "naming_violation"
    STRUCTURE_VIOLATION = "structure_violation"


class ArchitectureRule(Base):
    __tablename__ = "architecture_rules"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    organization_id = Column(GUID(), ForeignKey("organizations.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(String(1000), nullable=True)
    rule_type = Column(SQLEnum(RuleType), nullable=False)
    severity = Column(SQLEnum(RuleSeverity), default=RuleSeverity.WARNING)
    rule_definition = Column(JSON, nullable=False)
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    organization = relationship("Organization", back_populates="architecture_rules")
    violations = relationship("DependencyViolation", back_populates="rule")


class DependencyViolation(Base):
    __tablename__ = "dependency_violations"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    repository_id = Column(GUID(), ForeignKey("repositories.id"), nullable=False)
    rule_id = Column(GUID(), ForeignKey("architecture_rules.id"), nullable=False)
    source_module = Column(String(500), nullable=False)
    target_module = Column(String(500), nullable=False)
    violation_type = Column(SQLEnum(ViolationType), nullable=False)
    file_path = Column(String(500), nullable=True)
    line_number = Column(String(50), nullable=True)
    details = Column(JSON, default=dict)
    is_resolved = Column(Boolean, default=False)
    detected_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    # Relationships
    repository = relationship("Repository", back_populates="dependency_violations")
    rule = relationship("ArchitectureRule", back_populates="violations")
