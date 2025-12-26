import os
import re
import shutil
import subprocess
import tempfile
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import json
from collections import defaultdict


class IssueSeverity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class IssueCategory(str, Enum):
    SECURITY = "security"
    PERFORMANCE = "performance"
    CODE_QUALITY = "code_quality"
    BEST_PRACTICES = "best_practices"
    MAINTAINABILITY = "maintainability"
    BUG_RISK = "bug_risk"
    DEPENDENCY = "dependency"
    DOCUMENTATION = "documentation"
    COMPLEXITY = "complexity"
    DEAD_CODE = "dead_code"


@dataclass
class CodeIssue:
    file_path: str
    line_number: int
    category: IssueCategory
    severity: IssueSeverity
    title: str
    description: str
    suggestion: str
    code_snippet: str = ""


@dataclass
class FileAnalysis:
    file_path: str
    language: str
    lines_of_code: int
    blank_lines: int
    comment_lines: int
    complexity_score: float
    issues: List[CodeIssue] = field(default_factory=list)
    functions: List[Dict[str, Any]] = field(default_factory=list)
    imports: List[str] = field(default_factory=list)


@dataclass
class TechStackItem:
    name: str
    category: str  # framework, library, tool, language
    confidence: float
    version: Optional[str] = None


@dataclass
class FileReport:
    file_path: str
    language: str
    lines_of_code: int
    issues_count: int
    health_score: int
    issues: List[Dict[str, Any]]


@dataclass
class ReviewResult:
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


class CodeReviewService:
    # Security patterns to detect
    SECURITY_PATTERNS = {
        "python": [
            (r"exec\s*\(", "Dangerous exec() usage", "Avoid using exec() as it can execute arbitrary code", IssueSeverity.CRITICAL),
            (r"eval\s*\(", "Dangerous eval() usage", "Avoid using eval() as it can execute arbitrary code", IssueSeverity.CRITICAL),
            (r"subprocess\.call\s*\([^)]*shell\s*=\s*True", "Shell injection risk", "Avoid shell=True in subprocess calls", IssueSeverity.HIGH),
            (r"os\.system\s*\(", "Command injection risk", "Use subprocess with proper argument handling instead of os.system", IssueSeverity.HIGH),
            (r"pickle\.loads?\s*\(", "Insecure deserialization", "Pickle can execute arbitrary code during deserialization", IssueSeverity.HIGH),
            (r"password\s*=\s*['\"][^'\"]{3,}['\"]", "Hardcoded password", "Never hardcode passwords in source code", IssueSeverity.CRITICAL),
            (r"api_key\s*=\s*['\"][a-zA-Z0-9]{10,}['\"]", "Hardcoded API key", "Never hardcode API keys in source code", IssueSeverity.CRITICAL),
            (r"secret\s*=\s*['\"][^'\"]{5,}['\"]", "Hardcoded secret", "Never hardcode secrets in source code", IssueSeverity.HIGH),
            (r"md5\s*\(", "Weak hashing algorithm", "MD5 is cryptographically broken, use SHA-256 or better", IssueSeverity.MEDIUM),
            (r"sha1\s*\(", "Weak hashing algorithm", "SHA1 is deprecated for security purposes", IssueSeverity.MEDIUM),
            (r"\.format\s*\([^)]*\).*(?:SELECT|INSERT|UPDATE|DELETE)", "Potential SQL injection", "Use parameterized queries instead of string formatting", IssueSeverity.HIGH),
            (r"verify\s*=\s*False", "SSL verification disabled", "Never disable SSL verification in production", IssueSeverity.HIGH),
            (r"DEBUG\s*=\s*True", "Debug mode enabled", "Disable debug mode in production", IssueSeverity.MEDIUM),
        ],
        "javascript": [
            (r"eval\s*\(", "Dangerous eval() usage", "Avoid using eval() as it can execute arbitrary code", IssueSeverity.CRITICAL),
            (r"innerHTML\s*=", "XSS vulnerability risk", "Use textContent or proper sanitization instead of innerHTML", IssueSeverity.HIGH),
            (r"document\.write\s*\(", "DOM manipulation risk", "Avoid document.write, use DOM methods instead", IssueSeverity.MEDIUM),
            (r"password\s*[=:]\s*['\"][^'\"]{3,}['\"]", "Hardcoded password", "Never hardcode passwords in source code", IssueSeverity.CRITICAL),
            (r"api[_-]?key\s*[=:]\s*['\"][a-zA-Z0-9]{10,}['\"]", "Hardcoded API key", "Never hardcode API keys in source code", IssueSeverity.CRITICAL),
            (r"localStorage\.setItem\s*\(['\"](?:token|password|secret)", "Sensitive data in localStorage", "Consider using httpOnly cookies for sensitive data", IssueSeverity.MEDIUM),
            (r"new\s+Function\s*\(", "Dynamic code execution", "Avoid dynamic function creation", IssueSeverity.HIGH),
            (r"dangerouslySetInnerHTML", "React XSS risk", "Ensure content is properly sanitized", IssueSeverity.HIGH),
            (r"(?:http|ws)://(?!localhost)", "Insecure protocol", "Use HTTPS/WSS instead of HTTP/WS", IssueSeverity.MEDIUM),
        ],
        "typescript": [
            (r"eval\s*\(", "Dangerous eval() usage", "Avoid using eval()", IssueSeverity.CRITICAL),
            (r"innerHTML\s*=", "XSS vulnerability risk", "Use textContent or proper sanitization", IssueSeverity.HIGH),
            (r"as\s+any", "Type safety bypass", "Avoid using 'as any', define proper types", IssueSeverity.LOW),
            (r"@ts-ignore", "TypeScript error suppression", "Fix the underlying type issue", IssueSeverity.LOW),
            (r"@ts-nocheck", "TypeScript checking disabled", "Enable type checking for safety", IssueSeverity.MEDIUM),
            (r"password\s*[=:]\s*['\"][^'\"]{3,}['\"]", "Hardcoded password", "Never hardcode passwords", IssueSeverity.CRITICAL),
            (r"dangerouslySetInnerHTML", "React XSS risk", "Ensure proper sanitization", IssueSeverity.HIGH),
        ],
    }

    # Code quality patterns
    QUALITY_PATTERNS = {
        "python": [
            (r"except\s*:", "Bare except clause", "Catch specific exceptions instead", IssueSeverity.MEDIUM),
            (r"^\s*pass\s*$", "Empty code block", "Consider implementing or adding a comment explaining why empty", IssueSeverity.LOW),
            (r"print\s*\((?!.*#.*debug)", "Debug print statement", "Replace with proper logging", IssueSeverity.LOW),
            (r"TODO|FIXME|XXX|HACK|BUG", "Code marker found", "Address TODO/FIXME comments", IssueSeverity.INFO),
            (r"^\s*from\s+\S+\s+import\s+\*", "Wildcard import", "Import specific items instead", IssueSeverity.MEDIUM),
            (r"global\s+\w+", "Global variable usage", "Avoid global variables", IssueSeverity.MEDIUM),
            (r"time\.sleep\s*\(\s*\d{2,}\s*\)", "Long sleep duration", "Consider async or event-based approach", IssueSeverity.LOW),
            (r"except.*:\s*pass", "Silent exception", "Don't silently ignore exceptions", IssueSeverity.MEDIUM),
            (r"lambda.*lambda", "Nested lambda", "Consider using a regular function", IssueSeverity.LOW),
        ],
        "javascript": [
            (r"console\.(log|debug|info)\s*\(", "Debug console statement", "Remove in production", IssueSeverity.LOW),
            (r"debugger", "Debugger statement", "Remove before production", IssueSeverity.MEDIUM),
            (r"\bvar\s+", "Using var instead of let/const", "Use let or const", IssueSeverity.LOW),
            (r"==\s*null|null\s*==(?!=)", "Loose null comparison", "Use === for strict comparison", IssueSeverity.LOW),
            (r"TODO|FIXME|XXX|HACK", "Code marker found", "Address TODO/FIXME comments", IssueSeverity.INFO),
            (r"alert\s*\(", "Alert statement", "Remove alert() in production", IssueSeverity.LOW),
            (r"\.then\s*\([^)]*\)\s*$", "Missing catch handler", "Add error handling for promises", IssueSeverity.MEDIUM),
            (r"setTimeout\s*\([^,]+,\s*0\s*\)", "setTimeout with 0 delay", "Consider using queueMicrotask", IssueSeverity.INFO),
        ],
        "typescript": [
            (r"console\.(log|debug|info)\s*\(", "Debug console statement", "Remove in production", IssueSeverity.LOW),
            (r"debugger", "Debugger statement", "Remove before production", IssueSeverity.MEDIUM),
            (r": any(?:\s*[,\)\]>;}]|$)", "Using 'any' type", "Define proper types", IssueSeverity.MEDIUM),
            (r"TODO|FIXME|XXX|HACK", "Code marker found", "Address TODO/FIXME comments", IssueSeverity.INFO),
            (r"!\.", "Non-null assertion", "Consider proper null checking", IssueSeverity.LOW),
            (r"// @ts-expect-error(?!\s+\S)", "Unexplained ts-expect-error", "Add explanation comment", IssueSeverity.LOW),
        ],
    }

    # Dead code patterns
    DEAD_CODE_PATTERNS = {
        "python": [
            (r"^import\s+(\w+)", "unused_import"),
            (r"^from\s+\S+\s+import\s+(\w+)", "unused_import"),
        ],
        "javascript": [
            (r"^import\s+.*\s+from", "unused_import"),
            (r"^const\s+(\w+)\s*=", "unused_variable"),
        ],
        "typescript": [
            (r"^import\s+.*\s+from", "unused_import"),
            (r"^const\s+(\w+)\s*[=:]", "unused_variable"),
        ],
    }

    # File extensions to language mapping
    LANGUAGE_MAP = {
        ".py": "python",
        ".js": "javascript",
        ".jsx": "javascript",
        ".ts": "typescript",
        ".tsx": "typescript",
        ".java": "java",
        ".go": "go",
        ".rs": "rust",
        ".rb": "ruby",
        ".php": "php",
        ".cs": "csharp",
        ".cpp": "cpp",
        ".c": "c",
        ".h": "c",
        ".hpp": "cpp",
        ".swift": "swift",
        ".kt": "kotlin",
        ".scala": "scala",
        ".vue": "javascript",
        ".svelte": "javascript",
        ".md": "markdown",
        ".json": "json",
        ".yaml": "yaml",
        ".yml": "yaml",
    }

    # Tech stack detection patterns
    TECH_STACK_PATTERNS = {
        "package.json": {
            "react": ("React", "framework"),
            "next": ("Next.js", "framework"),
            "vue": ("Vue.js", "framework"),
            "angular": ("Angular", "framework"),
            "express": ("Express.js", "framework"),
            "fastify": ("Fastify", "framework"),
            "nest": ("NestJS", "framework"),
            "tailwindcss": ("Tailwind CSS", "library"),
            "axios": ("Axios", "library"),
            "prisma": ("Prisma", "library"),
            "mongoose": ("Mongoose", "library"),
            "typescript": ("TypeScript", "language"),
            "jest": ("Jest", "tool"),
            "vitest": ("Vitest", "tool"),
            "eslint": ("ESLint", "tool"),
            "prettier": ("Prettier", "tool"),
            "webpack": ("Webpack", "tool"),
            "vite": ("Vite", "tool"),
            "docker": ("Docker", "tool"),
        },
        "requirements.txt": {
            "fastapi": ("FastAPI", "framework"),
            "django": ("Django", "framework"),
            "flask": ("Flask", "framework"),
            "sqlalchemy": ("SQLAlchemy", "library"),
            "pandas": ("Pandas", "library"),
            "numpy": ("NumPy", "library"),
            "pytest": ("Pytest", "tool"),
            "celery": ("Celery", "library"),
            "redis": ("Redis", "library"),
            "pydantic": ("Pydantic", "library"),
            "alembic": ("Alembic", "tool"),
        },
        "go.mod": {
            "gin": ("Gin", "framework"),
            "echo": ("Echo", "framework"),
            "fiber": ("Fiber", "framework"),
            "gorm": ("GORM", "library"),
        },
        "Cargo.toml": {
            "actix": ("Actix", "framework"),
            "rocket": ("Rocket", "framework"),
            "tokio": ("Tokio", "library"),
            "serde": ("Serde", "library"),
        },
    }

    # Files/directories to ignore
    IGNORE_PATTERNS = [
        "node_modules", ".git", "__pycache__", ".venv", "venv",
        "dist", "build", ".next", "coverage", ".pytest_cache",
        ".mypy_cache", "*.min.js", "*.min.css", "package-lock.json",
        "yarn.lock", "poetry.lock", ".env", "*.map", "*.d.ts",
        ".idea", ".vscode", "target", "vendor",
    ]

    def __init__(self):
        self.temp_dir: Optional[str] = None

    def parse_github_url(self, url: str) -> Tuple[str, str, str, Optional[str]]:
        """Parse GitHub URL to extract owner, repo name, clone URL, and branch."""
        branch = None

        # Check for branch in URL
        branch_match = re.search(r"/tree/([^/]+)", url)
        if branch_match:
            branch = branch_match.group(1)

        # Handle various GitHub URL formats
        patterns = [
            r"github\.com[/:]([^/]+)/([^/]+?)(?:\.git)?(?:/tree/[^/]+)?/?$",
        ]

        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                owner, repo = match.groups()
                repo = repo.replace(".git", "")
                clone_url = f"https://github.com/{owner}/{repo}.git"
                return owner, repo, clone_url, branch

        raise ValueError(f"Invalid GitHub URL: {url}")

    def clone_repository(self, clone_url: str, branch: Optional[str] = None) -> str:
        """Clone repository to temporary directory."""
        self.temp_dir = tempfile.mkdtemp(prefix="code_review_")
        repo_path = os.path.join(self.temp_dir, "repo")

        try:
            cmd = ["git", "clone", "--depth", "100"]
            if branch:
                cmd.extend(["-b", branch])
            cmd.extend([clone_url, repo_path])

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
            if result.returncode != 0:
                raise Exception(f"Failed to clone repository: {result.stderr}")
            return repo_path
        except subprocess.TimeoutExpired:
            raise Exception("Repository clone timed out")
        except FileNotFoundError:
            raise Exception("Git is not installed or not in PATH")

    def cleanup(self):
        """Clean up temporary directory."""
        if self.temp_dir and os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir, ignore_errors=True)

    def should_ignore(self, path: str) -> bool:
        """Check if path should be ignored."""
        path_lower = path.lower()
        for pattern in self.IGNORE_PATTERNS:
            if pattern.startswith("*"):
                if path_lower.endswith(pattern[1:]):
                    return True
            elif pattern in path_lower:
                return True
        return False

    def get_language(self, file_path: str) -> Optional[str]:
        """Get language from file extension."""
        ext = Path(file_path).suffix.lower()
        return self.LANGUAGE_MAP.get(ext)

    def count_lines(self, lines: List[str], language: str) -> Tuple[int, int, int]:
        """Count code lines, blank lines, and comment lines."""
        code_lines = 0
        blank_lines = 0
        comment_lines = 0

        comment_patterns = {
            "python": (r"^\s*#", r'^\s*"""', r"^\s*'''"),
            "javascript": (r"^\s*//", r"^\s*/\*"),
            "typescript": (r"^\s*//", r"^\s*/\*"),
        }

        patterns = comment_patterns.get(language, (r"^\s*//", r"^\s*/\*"))
        in_multiline = False

        for line in lines:
            stripped = line.strip()
            if not stripped:
                blank_lines += 1
            elif any(re.match(p, line) for p in patterns):
                comment_lines += 1
            else:
                code_lines += 1

        return code_lines, blank_lines, comment_lines

    def calculate_complexity(self, content: str, language: str) -> Tuple[float, List[Dict]]:
        """Calculate code complexity and extract function info."""
        lines = content.split("\n")
        functions = []
        total_complexity = 0

        # Complexity indicators
        complexity_patterns = [
            r"\bif\b", r"\belse\b", r"\belif\b", r"\bfor\b", r"\bwhile\b",
            r"\btry\b", r"\bcatch\b", r"\bexcept\b", r"\bcase\b",
            r"\band\b", r"\bor\b", r"\b\?\s*:", r"\&\&", r"\|\|",
        ]

        # Function patterns
        function_patterns = {
            "python": r"^\s*(?:async\s+)?def\s+(\w+)\s*\(",
            "javascript": r"(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(?[^)]*\)?\s*=>|(\w+)\s*:\s*(?:async\s*)?\(?[^)]*\)?\s*=>)",
            "typescript": r"(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*[=:]\s*(?:async\s*)?\(?[^)]*\)?\s*=>|(\w+)\s*\([^)]*\)\s*[:{])",
        }

        func_pattern = function_patterns.get(language)
        current_func = None
        func_start = 0
        func_complexity = 0
        indent_stack = []

        for i, line in enumerate(lines):
            # Count complexity indicators
            for pattern in complexity_patterns:
                if re.search(pattern, line):
                    total_complexity += 1
                    if current_func:
                        func_complexity += 1

            # Detect functions
            if func_pattern:
                match = re.search(func_pattern, line)
                if match:
                    if current_func:
                        functions.append({
                            "name": current_func,
                            "start_line": func_start,
                            "end_line": i,
                            "lines": i - func_start,
                            "complexity": func_complexity,
                        })
                    current_func = next((g for g in match.groups() if g), "anonymous")
                    func_start = i + 1
                    func_complexity = 0

            # Check for deep nesting
            indent = len(line) - len(line.lstrip())
            if indent > 0 and line.strip():
                if language == "python":
                    nest_level = indent // 4
                else:
                    nest_level = line.count("{") - line.count("}")

        if current_func:
            functions.append({
                "name": current_func,
                "start_line": func_start,
                "end_line": len(lines),
                "lines": len(lines) - func_start,
                "complexity": func_complexity,
            })

        return total_complexity / max(len(lines) / 100, 1), functions

    def detect_deep_nesting(self, content: str, language: str) -> List[CodeIssue]:
        """Detect deeply nested code blocks."""
        issues = []
        lines = content.split("\n")
        max_nesting = 0
        current_nesting = 0

        for i, line in enumerate(lines):
            if language == "python":
                indent = len(line) - len(line.lstrip())
                if line.strip():
                    current_nesting = indent // 4
            else:
                current_nesting += line.count("{") - line.count("}")

            if current_nesting > 4:
                issues.append(CodeIssue(
                    file_path="",
                    line_number=i + 1,
                    category=IssueCategory.COMPLEXITY,
                    severity=IssueSeverity.MEDIUM,
                    title="Deep nesting detected",
                    description=f"Code is nested {current_nesting} levels deep",
                    suggestion="Consider extracting nested logic into separate functions",
                    code_snippet=line.strip()[:80]
                ))
                break  # Only report once per file

            max_nesting = max(max_nesting, current_nesting)

        return issues

    def detect_long_functions(self, functions: List[Dict], file_path: str) -> List[CodeIssue]:
        """Detect functions that are too long."""
        issues = []
        for func in functions:
            if func["lines"] > 50:
                issues.append(CodeIssue(
                    file_path=file_path,
                    line_number=func["start_line"],
                    category=IssueCategory.MAINTAINABILITY,
                    severity=IssueSeverity.MEDIUM,
                    title=f"Long function: {func['name']}",
                    description=f"Function has {func['lines']} lines (recommended < 50)",
                    suggestion="Break down into smaller, focused functions",
                    code_snippet=""
                ))
            if func["complexity"] > 10:
                issues.append(CodeIssue(
                    file_path=file_path,
                    line_number=func["start_line"],
                    category=IssueCategory.COMPLEXITY,
                    severity=IssueSeverity.MEDIUM,
                    title=f"Complex function: {func['name']}",
                    description=f"Cyclomatic complexity of {func['complexity']} (recommended < 10)",
                    suggestion="Reduce conditional complexity by extracting logic",
                    code_snippet=""
                ))
        return issues

    def check_documentation(self, content: str, file_path: str, language: str) -> Tuple[float, List[CodeIssue]]:
        """Check documentation quality."""
        issues = []
        lines = content.split("\n")

        # Count docstrings/comments
        doc_lines = 0
        total_functions = 0
        documented_functions = 0

        if language == "python":
            # Check for module docstring
            if not (content.strip().startswith('"""') or content.strip().startswith("'''")):
                issues.append(CodeIssue(
                    file_path=file_path,
                    line_number=1,
                    category=IssueCategory.DOCUMENTATION,
                    severity=IssueSeverity.INFO,
                    title="Missing module docstring",
                    description="Module lacks a docstring explaining its purpose",
                    suggestion="Add a docstring at the beginning of the file",
                    code_snippet=""
                ))

            # Check function docstrings
            func_pattern = r"^\s*(?:async\s+)?def\s+\w+\s*\("
            in_docstring = False
            for i, line in enumerate(lines):
                if re.match(func_pattern, line):
                    total_functions += 1
                    # Check if next non-empty line is docstring
                    for j in range(i + 1, min(i + 5, len(lines))):
                        next_line = lines[j].strip()
                        if next_line:
                            if next_line.startswith('"""') or next_line.startswith("'''"):
                                documented_functions += 1
                            break

        elif language in ("javascript", "typescript"):
            # Check for JSDoc comments
            jsdoc_pattern = r"^\s*/\*\*"
            func_pattern = r"(?:function\s+\w+|(?:const|let)\s+\w+\s*=\s*(?:async\s*)?\()"

            for i, line in enumerate(lines):
                if re.search(func_pattern, line):
                    total_functions += 1
                    # Check if previous lines have JSDoc
                    for j in range(i - 1, max(i - 5, 0), -1):
                        prev_line = lines[j].strip()
                        if prev_line.endswith("*/"):
                            documented_functions += 1
                            break
                        elif prev_line and not prev_line.startswith("*"):
                            break

        doc_score = (documented_functions / max(total_functions, 1)) * 100

        if total_functions > 3 and doc_score < 50:
            issues.append(CodeIssue(
                file_path=file_path,
                line_number=1,
                category=IssueCategory.DOCUMENTATION,
                severity=IssueSeverity.LOW,
                title="Low documentation coverage",
                description=f"Only {documented_functions}/{total_functions} functions are documented",
                suggestion="Add docstrings/JSDoc comments to public functions",
                code_snippet=""
            ))

        return doc_score, issues

    def detect_tech_stack(self, repo_path: str) -> List[TechStackItem]:
        """Detect technologies used in the repository."""
        tech_stack = []
        detected = set()

        for config_file, patterns in self.TECH_STACK_PATTERNS.items():
            file_path = os.path.join(repo_path, config_file)
            if os.path.exists(file_path):
                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read().lower()
                        for keyword, (name, category) in patterns.items():
                            if keyword.lower() in content and name not in detected:
                                # Try to extract version
                                version = None
                                version_match = re.search(
                                    rf'"{keyword}":\s*"[^"]*?(\d+\.\d+(?:\.\d+)?)',
                                    content, re.IGNORECASE
                                )
                                if version_match:
                                    version = version_match.group(1)

                                tech_stack.append(TechStackItem(
                                    name=name,
                                    category=category,
                                    confidence=0.9,
                                    version=version
                                ))
                                detected.add(name)
                except Exception:
                    pass

        # Detect by file presence
        file_indicators = {
            "Dockerfile": ("Docker", "tool"),
            "docker-compose.yml": ("Docker Compose", "tool"),
            ".github/workflows": ("GitHub Actions", "tool"),
            "Jenkinsfile": ("Jenkins", "tool"),
            ".gitlab-ci.yml": ("GitLab CI", "tool"),
            "terraform": ("Terraform", "tool"),
            "kubernetes": ("Kubernetes", "tool"),
            ".eslintrc": ("ESLint", "tool"),
            ".prettierrc": ("Prettier", "tool"),
            "tsconfig.json": ("TypeScript", "language"),
            "pyproject.toml": ("Python", "language"),
            "Cargo.toml": ("Rust", "language"),
            "go.mod": ("Go", "language"),
        }

        for indicator, (name, category) in file_indicators.items():
            check_path = os.path.join(repo_path, indicator)
            if os.path.exists(check_path) and name not in detected:
                tech_stack.append(TechStackItem(
                    name=name, category=category, confidence=0.95
                ))
                detected.add(name)

        return tech_stack

    def estimate_test_coverage(self, repo_path: str, total_files: int) -> Tuple[float, Dict]:
        """Estimate test coverage based on test file presence."""
        test_files = 0
        test_lines = 0
        source_lines = 0

        test_patterns = [
            r"test_.*\.py$", r".*_test\.py$", r".*\.test\.[jt]sx?$",
            r".*\.spec\.[jt]sx?$", r"__tests__", r"tests?/",
        ]

        for root, dirs, files in os.walk(repo_path):
            dirs[:] = [d for d in dirs if not self.should_ignore(d)]

            for file_name in files:
                file_path = os.path.join(root, file_name)
                relative_path = os.path.relpath(file_path, repo_path)

                if self.should_ignore(relative_path):
                    continue

                is_test = any(re.search(p, relative_path.replace("\\", "/")) for p in test_patterns)

                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        lines = len(f.readlines())
                        if is_test:
                            test_files += 1
                            test_lines += lines
                        else:
                            source_lines += lines
                except Exception:
                    pass

        coverage_estimate = min(100, (test_lines / max(source_lines, 1)) * 100 * 2)

        return coverage_estimate, {
            "test_files": test_files,
            "test_lines": test_lines,
            "source_lines": source_lines,
            "test_ratio": test_files / max(total_files - test_files, 1),
        }

    def get_git_hot_files(self, repo_path: str) -> List[Dict]:
        """Get files with most recent changes (hot files)."""
        hot_files = []
        try:
            result = subprocess.run(
                ["git", "log", "--pretty=format:", "--name-only", "-100"],
                cwd=repo_path, capture_output=True, text=True, timeout=30
            )
            if result.returncode == 0:
                file_counts = defaultdict(int)
                for line in result.stdout.split("\n"):
                    if line.strip() and not self.should_ignore(line):
                        file_counts[line.strip()] += 1

                sorted_files = sorted(file_counts.items(), key=lambda x: x[1], reverse=True)
                for file_path, count in sorted_files[:10]:
                    hot_files.append({
                        "file": file_path,
                        "changes": count,
                        "status": "hot" if count > 10 else "warm" if count > 5 else "normal"
                    })
        except Exception:
            pass

        return hot_files

    def analyze_file(self, file_path: str, repo_root: str) -> Optional[FileAnalysis]:
        """Analyze a single file for issues."""
        language = self.get_language(file_path)
        if not language:
            return None

        relative_path = os.path.relpath(file_path, repo_root)

        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
                lines = content.split("\n")
        except Exception:
            return None

        issues: List[CodeIssue] = []
        code_lines, blank_lines, comment_lines = self.count_lines(lines, language)
        complexity_score, functions = self.calculate_complexity(content, language)

        # Extract imports
        imports = []
        import_patterns = {
            "python": r"^(?:from\s+(\S+)\s+)?import\s+(.+)",
            "javascript": r"^import\s+.*from\s+['\"]([^'\"]+)['\"]",
            "typescript": r"^import\s+.*from\s+['\"]([^'\"]+)['\"]",
        }
        if language in import_patterns:
            for line in lines:
                match = re.match(import_patterns[language], line)
                if match:
                    imports.append(line.strip())

        # Apply security patterns
        security_patterns = self.SECURITY_PATTERNS.get(language, [])
        for pattern, title, suggestion, severity in security_patterns:
            for line_num, line in enumerate(lines, 1):
                if re.search(pattern, line, re.IGNORECASE):
                    issues.append(CodeIssue(
                        file_path=relative_path,
                        line_number=line_num,
                        category=IssueCategory.SECURITY,
                        severity=severity,
                        title=title,
                        description=f"Security issue in {language} code",
                        suggestion=suggestion,
                        code_snippet=line.strip()[:100]
                    ))

        # Apply quality patterns
        quality_patterns = self.QUALITY_PATTERNS.get(language, [])
        for pattern, title, suggestion, severity in quality_patterns:
            for line_num, line in enumerate(lines, 1):
                if re.search(pattern, line, re.IGNORECASE):
                    issues.append(CodeIssue(
                        file_path=relative_path,
                        line_number=line_num,
                        category=IssueCategory.CODE_QUALITY,
                        severity=severity,
                        title=title,
                        description=f"Code quality issue in {language}",
                        suggestion=suggestion,
                        code_snippet=line.strip()[:100]
                    ))

        # Check for deep nesting
        nesting_issues = self.detect_deep_nesting(content, language)
        for issue in nesting_issues:
            issue.file_path = relative_path
            issues.append(issue)

        # Check for long/complex functions
        func_issues = self.detect_long_functions(functions, relative_path)
        issues.extend(func_issues)

        # Check documentation
        doc_score, doc_issues = self.check_documentation(content, relative_path, language)
        issues.extend(doc_issues)

        # Check for large files
        if len(lines) > 500:
            issues.append(CodeIssue(
                file_path=relative_path,
                line_number=1,
                category=IssueCategory.MAINTAINABILITY,
                severity=IssueSeverity.MEDIUM,
                title="Large file",
                description=f"File has {len(lines)} lines",
                suggestion="Consider splitting into smaller modules",
                code_snippet=""
            ))

        # Check for long lines
        long_line_count = sum(1 for line in lines if len(line) > 120)
        if long_line_count > 5:
            issues.append(CodeIssue(
                file_path=relative_path,
                line_number=1,
                category=IssueCategory.CODE_QUALITY,
                severity=IssueSeverity.LOW,
                title="Multiple long lines",
                description=f"{long_line_count} lines exceed 120 characters",
                suggestion="Break long lines for better readability",
                code_snippet=""
            ))

        return FileAnalysis(
            file_path=relative_path,
            language=language,
            lines_of_code=code_lines,
            blank_lines=blank_lines,
            comment_lines=comment_lines,
            complexity_score=complexity_score,
            issues=issues,
            functions=functions,
            imports=imports
        )

    def check_dependencies(self, repo_path: str) -> List[CodeIssue]:
        """Check for dependency issues."""
        issues = []

        # Check package.json
        package_json = os.path.join(repo_path, "package.json")
        if os.path.exists(package_json):
            try:
                with open(package_json, "r") as f:
                    pkg = json.load(f)
                    deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}

                    for dep, version in deps.items():
                        if version.startswith("*") or version == "latest":
                            issues.append(CodeIssue(
                                file_path="package.json",
                                line_number=1,
                                category=IssueCategory.DEPENDENCY,
                                severity=IssueSeverity.HIGH,
                                title=f"Unpinned dependency: {dep}",
                                description=f"Dependency uses '{version}'",
                                suggestion="Pin to specific version",
                                code_snippet=f'"{dep}": "{version}"'
                            ))
                        elif version.startswith("^") or version.startswith("~"):
                            # Check for major version wildcards
                            if version.startswith("^0"):
                                issues.append(CodeIssue(
                                    file_path="package.json",
                                    line_number=1,
                                    category=IssueCategory.DEPENDENCY,
                                    severity=IssueSeverity.MEDIUM,
                                    title=f"Unstable dependency: {dep}",
                                    description=f"Version {version} is pre-1.0",
                                    suggestion="Consider pinning exact version for stability",
                                    code_snippet=f'"{dep}": "{version}"'
                                ))
            except Exception:
                pass

        # Check requirements.txt
        requirements_txt = os.path.join(repo_path, "requirements.txt")
        if os.path.exists(requirements_txt):
            try:
                with open(requirements_txt, "r") as f:
                    for line_num, line in enumerate(f, 1):
                        line = line.strip()
                        if line and not line.startswith("#"):
                            if not re.search(r"[=<>]", line):
                                issues.append(CodeIssue(
                                    file_path="requirements.txt",
                                    line_number=line_num,
                                    category=IssueCategory.DEPENDENCY,
                                    severity=IssueSeverity.MEDIUM,
                                    title=f"Unpinned: {line}",
                                    description="No version specified",
                                    suggestion="Pin to specific version",
                                    code_snippet=line
                                ))
            except Exception:
                pass

        return issues

    def check_readme(self, repo_path: str) -> Tuple[int, List[str]]:
        """Check README quality and return score with issues."""
        readme_files = ["README.md", "README.rst", "README.txt", "README"]
        readme_path = None

        for readme in readme_files:
            path = os.path.join(repo_path, readme)
            if os.path.exists(path):
                readme_path = path
                break

        if not readme_path:
            return 0, ["No README file found"]

        try:
            with open(readme_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
        except Exception:
            return 0, ["Could not read README file"]

        issues = []
        score = 100

        # Check length
        if len(content) < 100:
            issues.append("README is too short (< 100 characters)")
            score -= 30
        elif len(content) < 500:
            issues.append("README could be more detailed")
            score -= 10

        # Check for essential sections
        essential_patterns = [
            (r"#.*install", "Installation section"),
            (r"#.*usage|#.*getting started", "Usage section"),
            (r"#.*license", "License section"),
        ]

        for pattern, section in essential_patterns:
            if not re.search(pattern, content, re.IGNORECASE):
                issues.append(f"Missing {section}")
                score -= 15

        # Check for code examples
        if "```" not in content:
            issues.append("No code examples found")
            score -= 10

        return max(0, score), issues

    def analyze_repository(self, github_url: str, branch: Optional[str] = None) -> ReviewResult:
        """Main method to analyze a GitHub repository."""
        try:
            owner, repo_name, clone_url, url_branch = self.parse_github_url(github_url)
            target_branch = branch or url_branch or "main"

            repo_path = self.clone_repository(clone_url, target_branch if branch or url_branch else None)

            all_issues: List[CodeIssue] = []
            languages: Dict[str, int] = {}
            total_files = 0
            total_lines = 0
            file_reports: List[FileReport] = []
            all_functions = []
            total_complexity = 0
            doc_scores = []

            # Walk through repository
            for root, dirs, files in os.walk(repo_path):
                dirs[:] = [d for d in dirs if not self.should_ignore(d)]

                for file_name in files:
                    file_path = os.path.join(root, file_name)
                    relative_path = os.path.relpath(file_path, repo_path)

                    if self.should_ignore(relative_path):
                        continue

                    analysis = self.analyze_file(file_path, repo_path)
                    if analysis:
                        total_files += 1
                        total_lines += analysis.lines_of_code
                        languages[analysis.language] = languages.get(analysis.language, 0) + analysis.lines_of_code
                        all_issues.extend(analysis.issues)
                        all_functions.extend(analysis.functions)
                        total_complexity += analysis.complexity_score

                        # Create file report
                        file_health = max(0, 100 - len(analysis.issues) * 10)
                        file_reports.append(FileReport(
                            file_path=analysis.file_path,
                            language=analysis.language,
                            lines_of_code=analysis.lines_of_code,
                            issues_count=len(analysis.issues),
                            health_score=file_health,
                            issues=[{
                                "line": i.line_number,
                                "severity": i.severity.value,
                                "title": i.title
                            } for i in analysis.issues]
                        ))

            # Check dependencies
            dep_issues = self.check_dependencies(repo_path)
            all_issues.extend(dep_issues)

            # Detect tech stack
            tech_stack = self.detect_tech_stack(repo_path)

            # Estimate test coverage
            test_coverage, test_metrics = self.estimate_test_coverage(repo_path, total_files)

            # Check README
            readme_score, readme_issues = self.check_readme(repo_path)

            # Get hot files
            hot_files = self.get_git_hot_files(repo_path)

            # Calculate summary
            summary = {
                "critical": sum(1 for i in all_issues if i.severity == IssueSeverity.CRITICAL),
                "high": sum(1 for i in all_issues if i.severity == IssueSeverity.HIGH),
                "medium": sum(1 for i in all_issues if i.severity == IssueSeverity.MEDIUM),
                "low": sum(1 for i in all_issues if i.severity == IssueSeverity.LOW),
                "info": sum(1 for i in all_issues if i.severity == IssueSeverity.INFO),
            }

            # Category breakdown
            category_counts = {}
            for issue in all_issues:
                cat = issue.category.value
                category_counts[cat] = category_counts.get(cat, 0) + 1

            # Complexity metrics
            avg_func_length = sum(f["lines"] for f in all_functions) / max(len(all_functions), 1)
            avg_func_complexity = sum(f["complexity"] for f in all_functions) / max(len(all_functions), 1)

            complexity_metrics = {
                "average_file_complexity": round(total_complexity / max(total_files, 1), 2),
                "average_function_length": round(avg_func_length, 1),
                "average_function_complexity": round(avg_func_complexity, 1),
                "total_functions": len(all_functions),
                "long_functions": sum(1 for f in all_functions if f["lines"] > 50),
                "complex_functions": sum(1 for f in all_functions if f["complexity"] > 10),
            }

            # Generate recommendations
            recommendations = self._generate_recommendations(
                all_issues, summary, languages, test_coverage, readme_score, complexity_metrics
            )

            # Convert issues to dict
            issues_list = [
                {
                    "file_path": issue.file_path,
                    "line_number": issue.line_number,
                    "category": issue.category.value,
                    "severity": issue.severity.value,
                    "title": issue.title,
                    "description": issue.description,
                    "suggestion": issue.suggestion,
                    "code_snippet": issue.code_snippet,
                }
                for issue in all_issues
            ]

            # Sort by severity
            severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
            issues_list.sort(key=lambda x: severity_order.get(x["severity"], 5))

            # Sort file reports by issues count
            file_reports_list = sorted(
                [{"file_path": f.file_path, "language": f.language, "lines": f.lines_of_code,
                  "issues_count": f.issues_count, "health_score": f.health_score, "issues": f.issues}
                 for f in file_reports],
                key=lambda x: x["issues_count"], reverse=True
            )

            return ReviewResult(
                repository_url=github_url,
                repository_name=f"{owner}/{repo_name}",
                branch=target_branch,
                analyzed_at=datetime.utcnow().isoformat(),
                total_files=total_files,
                total_lines=total_lines,
                languages=languages,
                summary=summary,
                issues=issues_list,
                metrics={
                    "category_breakdown": category_counts,
                    "issues_per_1000_lines": round(len(all_issues) / max(total_lines / 1000, 1), 2),
                    "security_score": self._calculate_security_score(summary),
                    "quality_score": self._calculate_quality_score(summary, total_lines),
                    "test_metrics": test_metrics,
                    "readme_score": readme_score,
                    "readme_issues": readme_issues,
                },
                recommendations=recommendations,
                tech_stack=[{"name": t.name, "category": t.category, "version": t.version} for t in tech_stack],
                file_reports=file_reports_list[:50],  # Top 50 files
                documentation_score=readme_score,
                test_coverage_estimate=round(test_coverage, 1),
                complexity_metrics=complexity_metrics,
                hot_files=hot_files
            )

        finally:
            self.cleanup()

    def _calculate_security_score(self, summary: Dict[str, int]) -> int:
        """Calculate security score out of 100."""
        deductions = (
            summary["critical"] * 25 +
            summary["high"] * 15 +
            summary["medium"] * 5 +
            summary["low"] * 1
        )
        return max(0, 100 - deductions)

    def _calculate_quality_score(self, summary: Dict[str, int], total_lines: int) -> int:
        """Calculate code quality score out of 100."""
        total_issues = sum(summary.values())
        issues_ratio = total_issues / max(total_lines / 100, 1)
        return max(0, min(100, int(100 - issues_ratio * 10)))

    def _generate_recommendations(
        self, issues: List[CodeIssue], summary: Dict[str, int],
        languages: Dict[str, int], test_coverage: float,
        readme_score: int, complexity_metrics: Dict
    ) -> List[str]:
        """Generate actionable recommendations based on analysis."""
        recommendations = []

        if summary["critical"] > 0:
            recommendations.append(
                f"🚨 URGENT: {summary['critical']} critical security issues need immediate attention"
            )

        if summary["high"] > 0:
            recommendations.append(
                f"⚠️ Address {summary['high']} high-severity issues before production deployment"
            )

        # Check for hardcoded secrets
        secret_issues = [i for i in issues if "hardcoded" in i.title.lower()]
        if secret_issues:
            recommendations.append(
                "🔐 Move all hardcoded secrets to environment variables or a secrets manager"
            )

        # Test coverage
        if test_coverage < 30:
            recommendations.append(
                f"🧪 Test coverage is low (~{test_coverage:.0f}%). Add more unit tests"
            )
        elif test_coverage < 60:
            recommendations.append(
                f"🧪 Consider increasing test coverage (currently ~{test_coverage:.0f}%)"
            )

        # README
        if readme_score < 50:
            recommendations.append(
                "📝 Improve README documentation with installation, usage, and examples"
            )

        # Complexity
        if complexity_metrics.get("complex_functions", 0) > 5:
            recommendations.append(
                f"🔄 Refactor {complexity_metrics['complex_functions']} overly complex functions"
            )

        if complexity_metrics.get("long_functions", 0) > 5:
            recommendations.append(
                f"✂️ Break down {complexity_metrics['long_functions']} long functions into smaller units"
            )

        # Language-specific
        if "python" in languages:
            recommendations.append(
                "🐍 Add type hints, use black/ruff for formatting, and bandit for security scanning"
            )
        if "javascript" in languages or "typescript" in languages:
            recommendations.append(
                "📦 Use ESLint with security plugins and ensure strict TypeScript settings"
            )

        if not recommendations:
            recommendations.append("✅ Great job! The codebase looks healthy. Keep up the good work!")

        return recommendations[:8]  # Limit to top 8
