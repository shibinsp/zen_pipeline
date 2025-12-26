from pydantic import BaseModel
from typing import List, Dict, Any, Optional


class GitHubReviewRequest(BaseModel):
    repository_url: str
    branch: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "repository_url": "https://github.com/owner/repo",
                "branch": "main"
            }
        }


class TechStackItem(BaseModel):
    name: str
    category: str
    version: Optional[str] = None


class FileReportItem(BaseModel):
    file_path: str
    language: str
    lines: int
    issues_count: int
    health_score: int
    issues: List[Dict[str, Any]]


class ComplexityMetrics(BaseModel):
    average_file_complexity: float
    average_function_length: float
    average_function_complexity: float
    total_functions: int
    long_functions: int
    complex_functions: int


class HotFile(BaseModel):
    file: str
    changes: int
    status: str


class GitHubReviewResponse(BaseModel):
    repository_url: str
    repository_name: str
    branch: str
    analyzed_at: str
    total_files: int
    total_lines: int
    languages: Dict[str, int]
    summary: Dict[str, int]
    issues: List[Dict[str, Any]]
    metrics: Dict[str, Any]
    recommendations: List[str]
    tech_stack: List[Dict[str, Any]]
    file_reports: List[Dict[str, Any]]
    documentation_score: int
    test_coverage_estimate: float
    complexity_metrics: Dict[str, Any]
    hot_files: List[Dict[str, Any]]

    class Config:
        json_schema_extra = {
            "example": {
                "repository_url": "https://github.com/owner/repo",
                "repository_name": "owner/repo",
                "branch": "main",
                "analyzed_at": "2024-01-15T10:30:00",
                "total_files": 50,
                "total_lines": 5000,
                "languages": {"python": 3000, "javascript": 2000},
                "summary": {"critical": 0, "high": 2, "medium": 5, "low": 10, "info": 3},
                "issues": [],
                "metrics": {
                    "category_breakdown": {"security": 2, "code_quality": 15},
                    "issues_per_1000_lines": 4.0,
                    "security_score": 85,
                    "quality_score": 78
                },
                "recommendations": ["Address high-severity issues before production"],
                "tech_stack": [{"name": "FastAPI", "category": "framework", "version": "0.100.0"}],
                "file_reports": [],
                "documentation_score": 75,
                "test_coverage_estimate": 45.5,
                "complexity_metrics": {
                    "average_file_complexity": 2.5,
                    "average_function_length": 25.0,
                    "total_functions": 150
                },
                "hot_files": [{"file": "src/main.py", "changes": 15, "status": "hot"}]
            }
        }


class ExportFormat(BaseModel):
    format: str = "json"  # json, markdown, html
