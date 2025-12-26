from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import UUID


class TestRunCreate(BaseModel):
    repository_id: UUID
    commit_sha: str
    branch: Optional[str] = None
    test_framework: Optional[str] = None
    triggered_by: Optional[str] = None


class TestRunResponse(BaseModel):
    id: UUID
    repository_id: UUID
    commit_sha: str
    branch: Optional[str] = None
    status: str
    total_tests: int
    selected_tests: int
    passed: int
    failed: int
    skipped: int
    duration_ms: int
    coverage_percent: Optional[float] = None
    selection_accuracy: Optional[float] = None
    time_saved_percent: Optional[float] = None
    test_framework: Optional[str] = None
    triggered_by: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TestSelectionRequest(BaseModel):
    repository_id: UUID
    commit_sha: str
    changed_files: List[str]
    base_branch: Optional[str] = "main"


class SelectedTest(BaseModel):
    test_name: str
    test_file: str
    priority_score: float
    failure_probability: float
    reasons: List[str]


class TestSelectionResponse(BaseModel):
    repository_id: UUID
    commit_sha: str
    total_tests: int
    selected_count: int
    estimated_time_saved_percent: float
    selected_tests: List[SelectedTest]
    confidence_score: float


class TestResultSubmit(BaseModel):
    test_run_id: UUID
    tests: List[Dict[str, Any]]  # name, status, duration_ms, error_message


class FlakyTestResponse(BaseModel):
    id: UUID
    repository_id: UUID
    test_name: str
    test_file: Optional[str] = None
    test_suite: Optional[str] = None
    flakiness_score: float
    total_runs: int
    failure_count: int
    last_failure: Optional[datetime] = None
    last_success: Optional[datetime] = None
    status: str
    root_cause: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TestHistoryResponse(BaseModel):
    repository_id: UUID
    period: str
    total_runs: int
    avg_pass_rate: float
    avg_duration_ms: int
    avg_selection_accuracy: float
    avg_time_saved: float
    trend: str  # improving, stable, declining
    runs: List[TestRunResponse]


class CoverageReport(BaseModel):
    repository_id: UUID
    commit_sha: str
    overall_coverage: float
    line_coverage: float
    branch_coverage: float
    function_coverage: float
    files: List[Dict[str, Any]]  # path, coverage, uncovered_lines
