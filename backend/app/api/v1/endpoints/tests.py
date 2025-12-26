from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta
import random
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.test_run import TestRun, FlakyTest, TestRunStatus
from app.models.repository import Repository
from app.schemas.test_run import (
    TestRunCreate, TestRunResponse, TestSelectionRequest, TestSelectionResponse,
    SelectedTest, FlakyTestResponse, TestHistoryResponse, TestResultSubmit, CoverageReport
)
from app.schemas.common import PaginatedResponse

router = APIRouter()


@router.post("/select", response_model=TestSelectionResponse)
def select_tests(
    request: TestSelectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Mock ML-based test selection
    total_tests = random.randint(500, 2000)
    selected_count = int(total_tests * random.uniform(0.15, 0.35))

    selected_tests = []
    for i in range(min(selected_count, 20)):  # Return top 20
        selected_tests.append(SelectedTest(
            test_name=f"test_{random.choice(['unit', 'integration', 'e2e'])}_{i}",
            test_file=f"tests/{random.choice(['api', 'services', 'utils'])}/test_module_{i}.py",
            priority_score=round(random.uniform(0.7, 1.0), 2),
            failure_probability=round(random.uniform(0.1, 0.8), 2),
            reasons=[
                "Modified file in test scope",
                "Historical correlation with changed code",
                "High business criticality"
            ][:random.randint(1, 3)]
        ))

    selected_tests.sort(key=lambda x: x.priority_score, reverse=True)

    return TestSelectionResponse(
        repository_id=request.repository_id,
        commit_sha=request.commit_sha,
        total_tests=total_tests,
        selected_count=selected_count,
        estimated_time_saved_percent=round((1 - selected_count / total_tests) * 100, 1),
        selected_tests=selected_tests,
        confidence_score=round(random.uniform(0.82, 0.95), 2)
    )


@router.get("/history/{repo_id}", response_model=TestHistoryResponse)
def get_test_history(
    repo_id: UUID,
    period: str = Query("7d", regex="^(7d|30d|90d)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    days = {"7d": 7, "30d": 30, "90d": 90}[period]
    since = datetime.utcnow() - timedelta(days=days)

    runs = db.query(TestRun).filter(
        TestRun.repository_id == repo_id,
        TestRun.created_at >= since
    ).order_by(TestRun.created_at.desc()).limit(50).all()

    total_runs = len(runs)
    if total_runs > 0:
        avg_pass_rate = sum(r.passed / max(r.total_tests, 1) * 100 for r in runs) / total_runs
        avg_duration = sum(r.duration_ms for r in runs) / total_runs
        avg_accuracy = sum(r.selection_accuracy or 0 for r in runs) / total_runs
        avg_time_saved = sum(r.time_saved_percent or 0 for r in runs) / total_runs
    else:
        avg_pass_rate = 0
        avg_duration = 0
        avg_accuracy = 0
        avg_time_saved = 0

    return TestHistoryResponse(
        repository_id=repo_id,
        period=period,
        total_runs=total_runs,
        avg_pass_rate=round(avg_pass_rate, 1),
        avg_duration_ms=int(avg_duration),
        avg_selection_accuracy=round(avg_accuracy, 2),
        avg_time_saved=round(avg_time_saved, 1),
        trend="stable",
        runs=runs
    )


@router.get("/flaky/{repo_id}", response_model=PaginatedResponse[FlakyTestResponse])
def get_flaky_tests(
    repo_id: UUID,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(FlakyTest).filter(FlakyTest.repository_id == repo_id)

    if status:
        query = query.filter(FlakyTest.status == status)

    total = query.count()
    flaky_tests = query.order_by(FlakyTest.flakiness_score.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(
        items=flaky_tests,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.post("/results", response_model=TestRunResponse)
def submit_test_results(
    results: TestResultSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    test_run = db.query(TestRun).filter(TestRun.id == results.test_run_id).first()
    if not test_run:
        raise HTTPException(status_code=404, detail="Test run not found")

    # Process results
    passed = sum(1 for t in results.tests if t.get("status") == "passed")
    failed = sum(1 for t in results.tests if t.get("status") == "failed")
    skipped = sum(1 for t in results.tests if t.get("status") == "skipped")
    total_duration = sum(t.get("duration_ms", 0) for t in results.tests)

    test_run.passed = passed
    test_run.failed = failed
    test_run.skipped = skipped
    test_run.total_tests = len(results.tests)
    test_run.duration_ms = total_duration
    test_run.status = TestRunStatus.COMPLETED
    test_run.completed_at = datetime.utcnow()

    # Calculate selection accuracy
    if test_run.selected_tests > 0:
        test_run.selection_accuracy = min(1.0, failed / max(test_run.selected_tests, 1))

    db.commit()
    db.refresh(test_run)

    return test_run


@router.post("", response_model=TestRunResponse)
def create_test_run(
    run_data: TestRunCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    test_run = TestRun(
        repository_id=run_data.repository_id,
        commit_sha=run_data.commit_sha,
        branch=run_data.branch,
        test_framework=run_data.test_framework,
        triggered_by=run_data.triggered_by,
        status=TestRunStatus.PENDING,
        started_at=datetime.utcnow()
    )
    db.add(test_run)
    db.commit()
    db.refresh(test_run)

    return test_run


@router.get("/runs", response_model=PaginatedResponse[TestRunResponse])
def list_test_runs(
    repository_id: Optional[UUID] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(TestRun)

    if repository_id:
        query = query.filter(TestRun.repository_id == repository_id)

    if status:
        query = query.filter(TestRun.status == status)

    total = query.count()
    runs = query.order_by(TestRun.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(
        items=runs,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.patch("/flaky/{test_id}/status")
def update_flaky_test_status(
    test_id: UUID,
    status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    test = db.query(FlakyTest).filter(FlakyTest.id == test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Flaky test not found")

    test.status = status
    db.commit()

    return {"message": "Status updated successfully"}


@router.get("/coverage/{repo_id}", response_model=CoverageReport)
def get_coverage_report(
    repo_id: UUID,
    commit_sha: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Mock coverage report
    return CoverageReport(
        repository_id=repo_id,
        commit_sha=commit_sha or "abc123",
        overall_coverage=78.5,
        line_coverage=82.3,
        branch_coverage=71.2,
        function_coverage=85.6,
        files=[
            {"path": "src/api/endpoints.py", "coverage": 92.5, "uncovered_lines": [45, 67, 89]},
            {"path": "src/services/user.py", "coverage": 85.0, "uncovered_lines": [23, 34]},
            {"path": "src/utils/helpers.py", "coverage": 65.0, "uncovered_lines": [12, 15, 18, 22, 45]}
        ]
    )
