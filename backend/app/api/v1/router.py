from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, organizations, repositories, analysis, deployments, tests, architecture, admin

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(organizations.router, prefix="/organizations", tags=["Organizations"])
api_router.include_router(repositories.router, prefix="/repositories", tags=["Repositories"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["Code Analysis"])
api_router.include_router(deployments.router, prefix="/deployments", tags=["Deployments"])
api_router.include_router(tests.router, prefix="/tests", tags=["Test Intelligence"])
api_router.include_router(architecture.router, prefix="/architecture", tags=["Architecture"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
