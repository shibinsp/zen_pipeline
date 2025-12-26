from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import PlainTextResponse, JSONResponse
from app.schemas.code_review import GitHubReviewRequest, GitHubReviewResponse
from app.services.code_reviewer import CodeReviewService
from typing import Optional
import traceback
import json
from datetime import datetime

router = APIRouter()

# Store recent reviews for export (in production, use Redis or database)
recent_reviews = {}


def generate_markdown_report(result: dict) -> str:
    """Generate a markdown report from review results."""
    md = []
    md.append(f"# Code Review Report: {result['repository_name']}")
    md.append(f"\n**Analyzed:** {result['analyzed_at']}")
    md.append(f"\n**Branch:** {result['branch']}")
    md.append(f"\n**Repository:** [{result['repository_name']}]({result['repository_url']})")

    md.append("\n\n## Summary")
    md.append(f"\n- **Total Files:** {result['total_files']}")
    md.append(f"- **Total Lines:** {result['total_lines']:,}")
    md.append(f"- **Total Issues:** {sum(result['summary'].values())}")

    md.append("\n\n### Issue Breakdown")
    md.append(f"| Severity | Count |")
    md.append(f"|----------|-------|")
    for severity, count in result['summary'].items():
        emoji = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🔵", "info": "⚪"}.get(severity, "")
        md.append(f"| {emoji} {severity.capitalize()} | {count} |")

    md.append("\n\n## Scores")
    md.append(f"\n| Metric | Score |")
    md.append(f"|--------|-------|")
    md.append(f"| Security Score | {result['metrics']['security_score']}/100 |")
    md.append(f"| Quality Score | {result['metrics']['quality_score']}/100 |")
    md.append(f"| Documentation Score | {result['documentation_score']}/100 |")
    md.append(f"| Test Coverage (Est.) | {result['test_coverage_estimate']}% |")

    md.append("\n\n## Tech Stack")
    if result['tech_stack']:
        for tech in result['tech_stack']:
            version = f" v{tech['version']}" if tech.get('version') else ""
            md.append(f"- **{tech['name']}** ({tech['category']}){version}")
    else:
        md.append("No tech stack detected.")

    md.append("\n\n## Languages")
    total_lines = result['total_lines']
    for lang, lines in sorted(result['languages'].items(), key=lambda x: x[1], reverse=True):
        pct = (lines / total_lines) * 100 if total_lines > 0 else 0
        md.append(f"- {lang}: {lines:,} lines ({pct:.1f}%)")

    md.append("\n\n## Complexity Metrics")
    cm = result['complexity_metrics']
    md.append(f"- **Total Functions:** {cm.get('total_functions', 0)}")
    md.append(f"- **Avg Function Length:** {cm.get('average_function_length', 0):.1f} lines")
    md.append(f"- **Avg Function Complexity:** {cm.get('average_function_complexity', 0):.1f}")
    md.append(f"- **Long Functions (>50 lines):** {cm.get('long_functions', 0)}")
    md.append(f"- **Complex Functions:** {cm.get('complex_functions', 0)}")

    if result['hot_files']:
        md.append("\n\n## Hot Files (Most Changed)")
        md.append("\n| File | Changes | Status |")
        md.append("|------|---------|--------|")
        for hf in result['hot_files'][:10]:
            status_emoji = {"hot": "🔥", "warm": "🌡️", "normal": "✅"}.get(hf['status'], "")
            md.append(f"| `{hf['file']}` | {hf['changes']} | {status_emoji} {hf['status']} |")

    md.append("\n\n## Recommendations")
    for rec in result['recommendations']:
        md.append(f"- {rec}")

    if result['issues']:
        md.append("\n\n## Issues")

        # Group by severity
        by_severity = {}
        for issue in result['issues']:
            sev = issue['severity']
            if sev not in by_severity:
                by_severity[sev] = []
            by_severity[sev].append(issue)

        for severity in ['critical', 'high', 'medium', 'low', 'info']:
            if severity in by_severity:
                md.append(f"\n\n### {severity.capitalize()} ({len(by_severity[severity])})")
                for issue in by_severity[severity][:20]:  # Limit per severity
                    md.append(f"\n#### {issue['title']}")
                    md.append(f"- **File:** `{issue['file_path']}:{issue['line_number']}`")
                    md.append(f"- **Category:** {issue['category']}")
                    md.append(f"- **Description:** {issue['description']}")
                    md.append(f"- **Suggestion:** {issue['suggestion']}")
                    if issue.get('code_snippet'):
                        md.append(f"\n```\n{issue['code_snippet']}\n```")

    if result['file_reports']:
        md.append("\n\n## File Reports (Top 20 by Issues)")
        md.append("\n| File | Language | Lines | Issues | Health |")
        md.append("|------|----------|-------|--------|--------|")
        for fr in result['file_reports'][:20]:
            health_color = "🟢" if fr['health_score'] >= 80 else "🟡" if fr['health_score'] >= 50 else "🔴"
            md.append(f"| `{fr['file_path']}` | {fr['language']} | {fr['lines']} | {fr['issues_count']} | {health_color} {fr['health_score']}% |")

    md.append(f"\n\n---\n*Generated by Zen Pipeline AI on {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}*")

    return "\n".join(md)


@router.post("/review", response_model=GitHubReviewResponse)
async def review_github_repository(request: GitHubReviewRequest):
    """
    Analyze a GitHub repository for code issues.

    This endpoint clones the repository and analyzes all code files for:
    - Security vulnerabilities (hardcoded secrets, SQL injection, XSS, etc.)
    - Code quality issues (debug statements, code smells, etc.)
    - Complexity metrics (cyclomatic complexity, function length, nesting depth)
    - Documentation coverage
    - Test coverage estimation
    - Dependency health
    - Tech stack detection
    - Git history analysis (hot files)

    Returns a comprehensive review with issues categorized by severity.
    """
    try:
        service = CodeReviewService()
        result = service.analyze_repository(request.repository_url, request.branch)

        response_data = {
            "repository_url": result.repository_url,
            "repository_name": result.repository_name,
            "branch": result.branch,
            "analyzed_at": result.analyzed_at,
            "total_files": result.total_files,
            "total_lines": result.total_lines,
            "languages": result.languages,
            "summary": result.summary,
            "issues": result.issues,
            "metrics": result.metrics,
            "recommendations": result.recommendations,
            "tech_stack": result.tech_stack,
            "file_reports": result.file_reports,
            "documentation_score": result.documentation_score,
            "test_coverage_estimate": result.test_coverage_estimate,
            "complexity_metrics": result.complexity_metrics,
            "hot_files": result.hot_files,
        }

        # Store for export
        recent_reviews[result.repository_name] = response_data

        return GitHubReviewResponse(**response_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"Error analyzing repository: {e}")
        print(f"Traceback:\n{error_trace}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze repository: {str(e)}"
        )


@router.get("/export/{repo_owner}/{repo_name}")
async def export_review(
    repo_owner: str,
    repo_name: str,
    format: str = Query("json", description="Export format: json, markdown")
):
    """
    Export a recent review in different formats.

    Formats:
    - json: Full JSON data
    - markdown: Human-readable markdown report
    """
    repo_full_name = f"{repo_owner}/{repo_name}"

    if repo_full_name not in recent_reviews:
        raise HTTPException(
            status_code=404,
            detail=f"No recent review found for {repo_full_name}. Please run a review first."
        )

    result = recent_reviews[repo_full_name]

    if format == "markdown":
        markdown = generate_markdown_report(result)
        return PlainTextResponse(
            content=markdown,
            media_type="text/markdown",
            headers={
                "Content-Disposition": f'attachment; filename="{repo_name}-review.md"'
            }
        )
    else:
        return JSONResponse(
            content=result,
            headers={
                "Content-Disposition": f'attachment; filename="{repo_name}-review.json"'
            }
        )


@router.get("/health")
async def github_review_health():
    """Health check for the GitHub review service."""
    return {
        "status": "healthy",
        "service": "github-review",
        "version": "2.0",
        "features": [
            "security_scanning",
            "code_quality",
            "complexity_analysis",
            "documentation_check",
            "test_coverage_estimation",
            "tech_stack_detection",
            "git_history_analysis",
            "export_json",
            "export_markdown",
            "branch_selection"
        ]
    }
