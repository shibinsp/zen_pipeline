"""
Database initialization script.
Creates all tables and seeds an admin user.
"""
from app.core.database import engine, Base, SessionLocal
from app.core.security import get_password_hash
from app.models import User, Organization
from app.models.user import UserRole
import uuid


def init_database():
    """Create all database tables."""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")


def seed_admin_user():
    """Create default admin user if not exists."""
    db = SessionLocal()
    try:
        # Check if admin user already exists
        existing_admin = db.query(User).filter(User.email == "admin@zenpipeline.com").first()
        if existing_admin:
            print("Admin user already exists.")
            return existing_admin

        # Create default organization first
        org = Organization(
            id=uuid.uuid4(),
            name="Default Organization",
            slug="default-org"
        )
        db.add(org)
        db.flush()

        # Create admin user
        admin_user = User(
            id=uuid.uuid4(),
            email="admin@zenpipeline.com",
            name="Admin User",
            password_hash=get_password_hash("admin123"),
            role=UserRole.PLATFORM_ADMIN,
            organization_id=org.id,
            is_active=True
        )
        db.add(admin_user)
        db.commit()

        print("\n" + "="*50)
        print("Admin user created successfully!")
        print("="*50)
        print(f"Email:    admin@zenpipeline.com")
        print(f"Password: admin123")
        print("="*50 + "\n")

        return admin_user
    except Exception as e:
        db.rollback()
        print(f"Error creating admin user: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    init_database()
    seed_admin_user()
