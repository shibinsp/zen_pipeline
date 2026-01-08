from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import UUID


class RuleCreate(BaseModel):
    organization_id: UUID
    name: str
    description: Optional[str] = None
    rule_type: str  # dependency, naming, structure, import, layer
    severity: Optional[str] = "warning"
    rule_definition: Dict[str, Any]
    enabled: Optional[bool] = True


class RuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    rule_definition: Optional[Dict[str, Any]] = None
    enabled: Optional[bool] = None


class RuleResponse(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
    description: Optional[str] = None
    rule_type: str
    severity: str
    rule_definition: Dict[str, Any]
    enabled: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    violations_count: Optional[int] = None

    class Config:
        from_attributes = True
        use_enum_values = True


class ViolationResponse(BaseModel):
    id: UUID
    repository_id: UUID
    rule_id: UUID
    rule_name: Optional[str] = None
    source_module: str
    target_module: str
    violation_type: str
    file_path: Optional[str] = None
    line_number: Optional[str] = None
    details: Dict[str, Any]
    is_resolved: bool
    detected_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DependencyNode(BaseModel):
    id: str
    name: str
    type: str  # module, package, service
    size: Optional[int] = None
    health_score: Optional[float] = None
    file_count: Optional[int] = None


class DependencyEdge(BaseModel):
    source: str
    target: str
    weight: Optional[int] = 1
    type: str  # import, call, data


class DependencyGraphResponse(BaseModel):
    repository_id: UUID
    nodes: List[DependencyNode]
    edges: List[DependencyEdge]
    circular_dependencies: List[List[str]]
    layers: Optional[Dict[str, List[str]]] = None


class ValidateRequest(BaseModel):
    repository_id: UUID
    commit_sha: Optional[str] = None
    rules: Optional[List[UUID]] = None  # specific rules to validate, or all if None


class ValidationResult(BaseModel):
    rule_id: UUID
    rule_name: str
    passed: bool
    violations: List[ViolationResponse]


class ValidateResponse(BaseModel):
    repository_id: UUID
    passed: bool
    total_rules: int
    passed_rules: int
    failed_rules: int
    results: List[ValidationResult]


class DriftReport(BaseModel):
    repository_id: UUID
    baseline_date: datetime
    current_date: datetime
    drift_score: float  # 0-100
    changes: List[Dict[str, Any]]
    new_dependencies: List[str]
    removed_dependencies: List[str]
    layer_violations: List[ViolationResponse]
    recommendations: List[str]


class ComplianceStatus(BaseModel):
    repository_id: UUID
    overall_score: float
    rules_compliant: int
    rules_violated: int
    critical_violations: int
    last_checked: datetime
    trend: str  # improving, stable, declining
