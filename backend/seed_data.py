#!/usr/bin/env python3
"""
Database Seed Script for Zen Pipeline AI
Creates initial data for testing and development
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timedelta
import uuid
from sqlalchemy.orm import Session

from app.core.database import engine, SessionLocal, Base
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.organization import Organization, Team, TeamMember, TeamRole, PlanType
from app.models.repository import Repository, RepositoryProvider
from app.models.scan import ScanResult, Vulnerability, ScanType, ScanStatus, VulnerabilitySeverity, VulnerabilityStatus
from app.models.deployment import Deployment, DeploymentStatus, DeploymentStrategy
from app.models.test_run import TestRun, FlakyTest, TestRunStatus, FlakyTestStatus
from app.models.architecture import ArchitectureRule, RuleType
from app.models.audit_log import AuditLog, AuditAction, ResourceType


def create_seed_data(db: Session):
    """Create all seed data"""

    print("Creating seed data...")

    # Check if data already exists
    existing_org = db.query(Organization).first()
    if existing_org:
        print("Seed data already exists. Skipping...")
        return

    # Create Organizations
    print("Creating organizations...")
    org1 = Organization(
        id=uuid.uuid4(),
        name="NxZen Technologies",
        slug="nxzen",
        plan=PlanType.ENTERPRISE,
        settings={"features": ["advanced_analytics", "custom_rules", "sso"]},
    )
    db.add(org1)

    org2 = Organization(
        id=uuid.uuid4(),
        name="Acme Corp",
        slug="acme",
        plan=PlanType.PROFESSIONAL,
        settings={"features": ["advanced_analytics"]},
    )
    db.add(org2)
    db.flush()

    # Create Users
    print("Creating users...")
    admin_user = User(
        id=uuid.uuid4(),
        email="admin@zenpipeline.ai",
        name="Platform Admin",
        password_hash=get_password_hash("Admin123!"),
        role=UserRole.PLATFORM_ADMIN,
        organization_id=org1.id,
        is_active=True,
        last_login=datetime.utcnow() - timedelta(hours=1),
    )
    db.add(admin_user)

    org_admin = User(
        id=uuid.uuid4(),
        email="john@nxzen.com",
        name="John Doe",
        password_hash=get_password_hash("Password123!"),
        role=UserRole.ORG_ADMIN,
        organization_id=org1.id,
        is_active=True,
        last_login=datetime.utcnow() - timedelta(hours=2),
    )
    db.add(org_admin)

    team_lead = User(
        id=uuid.uuid4(),
        email="jane@nxzen.com",
        name="Jane Smith",
        password_hash=get_password_hash("Password123!"),
        role=UserRole.TEAM_LEAD,
        organization_id=org1.id,
        is_active=True,
        last_login=datetime.utcnow() - timedelta(hours=5),
    )
    db.add(team_lead)

    developer1 = User(
        id=uuid.uuid4(),
        email="mike@nxzen.com",
        name="Mike Johnson",
        password_hash=get_password_hash("Password123!"),
        role=UserRole.DEVELOPER,
        organization_id=org1.id,
        is_active=True,
        last_login=datetime.utcnow() - timedelta(hours=3),
    )
    db.add(developer1)

    developer2 = User(
        id=uuid.uuid4(),
        email="sarah@nxzen.com",
        name="Sarah Wilson",
        password_hash=get_password_hash("Password123!"),
        role=UserRole.DEVELOPER,
        organization_id=org1.id,
        is_active=True,
        last_login=datetime.utcnow() - timedelta(days=1),
    )
    db.add(developer2)

    viewer = User(
        id=uuid.uuid4(),
        email="tom@nxzen.com",
        name="Tom Brown",
        password_hash=get_password_hash("Password123!"),
        role=UserRole.VIEWER,
        organization_id=org1.id,
        is_active=True,
        last_login=datetime.utcnow() - timedelta(days=3),
    )
    db.add(viewer)

    # Demo user for easy login
    demo_user = User(
        id=uuid.uuid4(),
        email="demo@zenpipeline.ai",
        name="Demo User",
        password_hash=get_password_hash("demo123"),
        role=UserRole.DEVELOPER,
        organization_id=org1.id,
        is_active=True,
        last_login=datetime.utcnow(),
    )
    db.add(demo_user)
    db.flush()

    # Create Teams
    print("Creating teams...")
    backend_team = Team(
        id=uuid.uuid4(),
        name="Backend Team",
        description="Backend services and API development",
        organization_id=org1.id,
    )
    db.add(backend_team)

    frontend_team = Team(
        id=uuid.uuid4(),
        name="Frontend Team",
        description="Web and mobile UI development",
        organization_id=org1.id,
    )
    db.add(frontend_team)

    devops_team = Team(
        id=uuid.uuid4(),
        name="DevOps Team",
        description="Infrastructure and deployment automation",
        organization_id=org1.id,
    )
    db.add(devops_team)
    db.flush()

    # Add team members
    db.add(TeamMember(user_id=team_lead.id, team_id=backend_team.id, role=TeamRole.LEAD))
    db.add(TeamMember(user_id=developer1.id, team_id=backend_team.id, role=TeamRole.MEMBER))
    db.add(TeamMember(user_id=developer2.id, team_id=frontend_team.id, role=TeamRole.MEMBER))
    db.add(TeamMember(user_id=org_admin.id, team_id=devops_team.id, role=TeamRole.LEAD))
    db.flush()

    # Create Repositories
    print("Creating repositories...")
    repo1 = Repository(
        id=uuid.uuid4(),
        name="api-service",
        full_name="nxzen/api-service",
        url="https://github.com/nxzen/api-service",
        provider=RepositoryProvider.GITHUB,
        default_branch="main",
        organization_id=org1.id,
        settings={"auto_scan": True, "branch_protection": True},
    )
    db.add(repo1)

    repo2 = Repository(
        id=uuid.uuid4(),
        name="frontend-app",
        full_name="nxzen/frontend-app",
        url="https://github.com/nxzen/frontend-app",
        provider=RepositoryProvider.GITHUB,
        default_branch="main",
        organization_id=org1.id,
        settings={"auto_scan": True},
    )
    db.add(repo2)

    repo3 = Repository(
        id=uuid.uuid4(),
        name="payment-service",
        full_name="nxzen/payment-service",
        url="https://github.com/nxzen/payment-service",
        provider=RepositoryProvider.GITHUB,
        default_branch="main",
        organization_id=org1.id,
        settings={"auto_scan": True, "security_alerts": True},
    )
    db.add(repo3)

    repo4 = Repository(
        id=uuid.uuid4(),
        name="user-service",
        full_name="nxzen/user-service",
        url="https://github.com/nxzen/user-service",
        provider=RepositoryProvider.GITHUB,
        default_branch="main",
        organization_id=org1.id,
    )
    db.add(repo4)
    db.flush()

    # Create Scan Results
    print("Creating scan results...")
    scan1 = ScanResult(
        id=uuid.uuid4(),
        repository_id=repo1.id,
        commit_sha="abc123def456",
        branch="main",
        scan_type=ScanType.SECURITY,
        status=ScanStatus.COMPLETED,
        critical_count=2,
        high_count=5,
        medium_count=12,
        low_count=23,
        started_at=datetime.utcnow() - timedelta(hours=1),
        completed_at=datetime.utcnow() - timedelta(minutes=45),
    )
    db.add(scan1)

    scan2 = ScanResult(
        id=uuid.uuid4(),
        repository_id=repo2.id,
        commit_sha="def789ghi012",
        branch="main",
        scan_type=ScanType.DEPENDENCY,
        status=ScanStatus.COMPLETED,
        critical_count=0,
        high_count=3,
        medium_count=8,
        low_count=15,
        started_at=datetime.utcnow() - timedelta(hours=2),
        completed_at=datetime.utcnow() - timedelta(hours=1, minutes=30),
    )
    db.add(scan2)

    scan3 = ScanResult(
        id=uuid.uuid4(),
        repository_id=repo3.id,
        commit_sha="ghi345jkl678",
        branch="develop",
        scan_type=ScanType.QUALITY,
        status=ScanStatus.RUNNING,
        critical_count=0,
        high_count=0,
        medium_count=0,
        low_count=0,
        started_at=datetime.utcnow() - timedelta(minutes=10),
    )
    db.add(scan3)
    db.flush()

    # Create Vulnerabilities
    print("Creating vulnerabilities...")
    vulns = [
        Vulnerability(
            id=uuid.uuid4(),
            scan_id=scan1.id,
            title="SQL Injection in user query",
            description="User input is directly concatenated into SQL query without sanitization",
            severity=VulnerabilitySeverity.CRITICAL,
            status=VulnerabilityStatus.OPEN,
            file_path="src/services/user_service.py",
            line_number=145,
            cwe_id="CWE-89",
            recommendation="Use parameterized queries or ORM methods",
        ),
        Vulnerability(
            id=uuid.uuid4(),
            scan_id=scan1.id,
            title="Hardcoded API Key",
            description="API key is hardcoded in the source code",
            severity=VulnerabilitySeverity.CRITICAL,
            status=VulnerabilityStatus.OPEN,
            file_path="src/config/settings.py",
            line_number=23,
            cwe_id="CWE-798",
            recommendation="Move secrets to environment variables",
        ),
        Vulnerability(
            id=uuid.uuid4(),
            scan_id=scan1.id,
            title="Cross-Site Scripting (XSS)",
            description="User input is rendered without proper escaping",
            severity=VulnerabilitySeverity.HIGH,
            status=VulnerabilityStatus.IN_PROGRESS,
            file_path="src/templates/profile.html",
            line_number=67,
            cwe_id="CWE-79",
            recommendation="Use template engine's auto-escaping feature",
        ),
        Vulnerability(
            id=uuid.uuid4(),
            scan_id=scan2.id,
            title="Outdated dependency: lodash",
            description="lodash 4.17.15 has known vulnerabilities",
            severity=VulnerabilitySeverity.HIGH,
            status=VulnerabilityStatus.OPEN,
            file_path="package.json",
            line_number=15,
            cvss_score="7.5",
            recommendation="Upgrade to lodash 4.17.21 or later",
        ),
        Vulnerability(
            id=uuid.uuid4(),
            scan_id=scan2.id,
            title="Insecure cookie settings",
            description="Session cookie is missing Secure and HttpOnly flags",
            severity=VulnerabilitySeverity.MEDIUM,
            status=VulnerabilityStatus.OPEN,
            file_path="src/middleware/session.js",
            line_number=34,
            cwe_id="CWE-614",
            recommendation="Set Secure and HttpOnly flags on session cookies",
        ),
    ]
    for vuln in vulns:
        db.add(vuln)
    db.flush()

    # Create Deployments
    print("Creating deployments...")
    from app.models.deployment import Environment
    deployments = [
        Deployment(
            id=uuid.uuid4(),
            repository_id=repo1.id,
            environment=Environment.PRODUCTION,
            version="v2.4.1",
            commit_sha="abc123def456",
            status=DeploymentStatus.COMPLETED,
            strategy=DeploymentStrategy.ROLLING,
            risk_score=25,
            deployed_by=org_admin.id,
            started_at=datetime.utcnow() - timedelta(hours=1),
            completed_at=datetime.utcnow() - timedelta(minutes=45),
        ),
        Deployment(
            id=uuid.uuid4(),
            repository_id=repo3.id,
            environment=Environment.STAGING,
            version="v1.8.0",
            commit_sha="ghi345jkl678",
            status=DeploymentStatus.IN_PROGRESS,
            strategy=DeploymentStrategy.CANARY,
            risk_score=42,
            deployed_by=team_lead.id,
            started_at=datetime.utcnow() - timedelta(minutes=30),
        ),
        Deployment(
            id=uuid.uuid4(),
            repository_id=repo2.id,
            environment=Environment.PRODUCTION,
            version="v3.1.0",
            commit_sha="xyz789abc012",
            status=DeploymentStatus.COMPLETED,
            strategy=DeploymentStrategy.BLUE_GREEN,
            risk_score=18,
            deployed_by=developer1.id,
            started_at=datetime.utcnow() - timedelta(days=1),
            completed_at=datetime.utcnow() - timedelta(days=1) + timedelta(minutes=20),
        ),
        Deployment(
            id=uuid.uuid4(),
            repository_id=repo4.id,
            environment=Environment.STAGING,
            version="v2.0.0-beta",
            commit_sha="mno456pqr789",
            status=DeploymentStatus.FAILED,
            strategy=DeploymentStrategy.ROLLING,
            risk_score=67,
            deployed_by=developer2.id,
            started_at=datetime.utcnow() - timedelta(hours=3),
            completed_at=datetime.utcnow() - timedelta(hours=2, minutes=45),
            notes="Health check failed after deployment",
        ),
    ]
    for deploy in deployments:
        db.add(deploy)
    db.flush()

    # Create Test Runs
    print("Creating test runs...")
    test_runs = [
        TestRun(
            id=uuid.uuid4(),
            repository_id=repo1.id,
            commit_sha="abc123def456",
            branch="main",
            status=TestRunStatus.COMPLETED,
            total_tests=250,
            passed=248,
            failed=2,
            skipped=0,
            duration_ms=145000,
            coverage_percent=87.5,
            started_at=datetime.utcnow() - timedelta(hours=2),
            completed_at=datetime.utcnow() - timedelta(hours=1, minutes=45),
        ),
        TestRun(
            id=uuid.uuid4(),
            repository_id=repo2.id,
            commit_sha="def789ghi012",
            branch="main",
            status=TestRunStatus.COMPLETED,
            total_tests=180,
            passed=180,
            failed=0,
            skipped=5,
            duration_ms=98000,
            coverage_percent=92.3,
            started_at=datetime.utcnow() - timedelta(hours=4),
            completed_at=datetime.utcnow() - timedelta(hours=3, minutes=30),
        ),
        TestRun(
            id=uuid.uuid4(),
            repository_id=repo4.id,
            commit_sha="mno456pqr789",
            branch="develop",
            status=TestRunStatus.FAILED,
            total_tests=120,
            passed=115,
            failed=5,
            skipped=0,
            duration_ms=67000,
            coverage_percent=78.2,
            started_at=datetime.utcnow() - timedelta(hours=5),
            completed_at=datetime.utcnow() - timedelta(hours=4, minutes=45),
        ),
    ]
    for test_run in test_runs:
        db.add(test_run)
    db.flush()

    # Create Flaky Tests
    print("Creating flaky tests...")
    flaky_tests = [
        FlakyTest(
            id=uuid.uuid4(),
            repository_id=repo1.id,
            test_name="test_user_authentication_timeout",
            test_file="tests/test_auth.py",
            flakiness_score=0.35,
            last_failure=datetime.utcnow() - timedelta(hours=6),
            failure_count=14,
            total_runs=40,
            status=FlakyTestStatus.QUARANTINED,
        ),
        FlakyTest(
            id=uuid.uuid4(),
            repository_id=repo1.id,
            test_name="test_database_connection_pool",
            test_file="tests/test_db.py",
            flakiness_score=0.15,
            last_failure=datetime.utcnow() - timedelta(days=1),
            failure_count=6,
            total_runs=40,
            status=FlakyTestStatus.ACTIVE,
        ),
        FlakyTest(
            id=uuid.uuid4(),
            repository_id=repo2.id,
            test_name="test_async_component_render",
            test_file="src/__tests__/AsyncComponent.test.tsx",
            flakiness_score=0.25,
            last_failure=datetime.utcnow() - timedelta(hours=12),
            failure_count=10,
            total_runs=40,
            status=FlakyTestStatus.QUARANTINED,
        ),
    ]
    for flaky in flaky_tests:
        db.add(flaky)
    db.flush()

    # Create Architecture Rules
    print("Creating architecture rules...")
    from app.models.architecture import RuleSeverity
    rules = [
        ArchitectureRule(
            id=uuid.uuid4(),
            organization_id=org1.id,
            name="No circular dependencies",
            description="Prevent circular import dependencies between modules",
            rule_type=RuleType.DEPENDENCY,
            rule_definition={"pattern": "**/*.py", "check": "circular"},
            enabled=True,
            severity=RuleSeverity.ERROR,
        ),
        ArchitectureRule(
            id=uuid.uuid4(),
            organization_id=org1.id,
            name="Service layer isolation",
            description="Services should not directly import from controllers",
            rule_type=RuleType.LAYER,
            rule_definition={"pattern": "src/services/**", "forbidden_imports": ["src/controllers/**"]},
            enabled=True,
            severity=RuleSeverity.ERROR,
        ),
        ArchitectureRule(
            id=uuid.uuid4(),
            organization_id=org1.id,
            name="Maximum module coupling",
            description="Modules should not have more than 10 external dependencies",
            rule_type=RuleType.DEPENDENCY,
            rule_definition={"pattern": "**/*.py", "max_dependencies": 10},
            enabled=True,
            severity=RuleSeverity.WARNING,
        ),
    ]
    for rule in rules:
        db.add(rule)
    db.flush()

    # Create Audit Logs
    print("Creating audit logs...")
    audit_logs = [
        AuditLog(
            id=uuid.uuid4(),
            organization_id=org1.id,
            user_id=org_admin.id,
            action=AuditAction.LOGIN,
            resource_type=ResourceType.USER,
            resource_id=org_admin.id,
            details={"email": org_admin.email},
            status="success",
            created_at=datetime.utcnow() - timedelta(hours=2),
        ),
        AuditLog(
            id=uuid.uuid4(),
            organization_id=org1.id,
            user_id=org_admin.id,
            action=AuditAction.CREATE,
            resource_type=ResourceType.DEPLOYMENT,
            resource_id=deployments[0].id,
            details={"environment": "production", "version": "v2.4.1"},
            status="success",
            created_at=datetime.utcnow() - timedelta(hours=1),
        ),
        AuditLog(
            id=uuid.uuid4(),
            organization_id=org1.id,
            user_id=team_lead.id,
            action=AuditAction.CREATE,
            resource_type=ResourceType.SCAN,
            resource_id=scan1.id,
            details={"scan_type": "SAST", "repository": "api-service"},
            status="success",
            created_at=datetime.utcnow() - timedelta(hours=1, minutes=30),
        ),
        AuditLog(
            id=uuid.uuid4(),
            organization_id=org1.id,
            user_id=developer1.id,
            action=AuditAction.UPDATE,
            resource_type=ResourceType.SCAN,
            resource_id=scan1.id,
            details={"status_change": "open -> in_progress", "vulnerability_updated": True},
            status="success",
            created_at=datetime.utcnow() - timedelta(minutes=45),
        ),
    ]
    for log in audit_logs:
        db.add(log)

    db.commit()
    print("Seed data created successfully!")

    # Print login credentials
    print("\n" + "="*50)
    print("LOGIN CREDENTIALS")
    print("="*50)
    print("\nAdmin User:")
    print("  Email: admin@zenpipeline.ai")
    print("  Password: Admin123!")
    print("\nDemo User:")
    print("  Email: demo@zenpipeline.ai")
    print("  Password: demo123")
    print("\nOrg Admin:")
    print("  Email: john@nxzen.com")
    print("  Password: Password123!")
    print("\nDeveloper:")
    print("  Email: mike@nxzen.com")
    print("  Password: Password123!")
    print("="*50 + "\n")


def main():
    print("Initializing database...")

    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)

    # Create session and seed data
    db = SessionLocal()
    try:
        create_seed_data(db)
    except Exception as e:
        print(f"Error creating seed data: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
