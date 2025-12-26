# Zen Pipeline AI

A comprehensive DevOps pipeline management platform with AI-powered code analysis, testing orchestration, deployment management, and architecture visualization.

## Features

- **Dashboard** - Real-time overview of pipeline health, vulnerability metrics, and activity timeline
- **Code Analysis** - Automated code scanning and vulnerability detection
- **Testing** - Test orchestration and efficiency tracking
- **Deployments** - Deployment pipeline management and monitoring
- **Architecture** - System architecture visualization
- **Analytics** - Risk trends and performance metrics

### Administration

- User management
- Team organization
- Third-party integrations
- Audit logging
- System settings

## Tech Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **State Management**: Zustand
- **Data Fetching**: TanStack React Query
- **Charts**: Recharts, D3.js

### Backend
- **Framework**: FastAPI
- **ORM**: SQLAlchemy 2.0
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Migrations**: Alembic
- **Authentication**: JWT (python-jose)

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)

## Quick Start

### Using Docker Compose (Recommended)

1. Clone the repository:
   ```bash
   git clone https://github.com/shibinsp/zen_pipeline.git
   cd zen_pipeline
   ```

2. Start all services:
   ```bash
   docker-compose up -d
   ```

3. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Local Development

#### Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. Run the development server:
   ```bash
   uvicorn app.main:app --reload
   ```

#### Frontend

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

### Backend

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `SECRET_KEY` | JWT secret key | - |
| `ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiration time | `30` |
| `CORS_ORIGINS` | Allowed CORS origins | `["http://localhost:3000"]` |

### Frontend

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8000/api/v1` |

## Project Structure

```
zen_pipeline/
├── backend/
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── core/          # Core configuration
│   │   ├── models/        # SQLAlchemy models
│   │   └── schemas/       # Pydantic schemas
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── app/               # Next.js app router pages
│   ├── components/        # React components
│   ├── lib/               # Utilities and stores
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

## API Documentation

When the backend is running, access the interactive API documentation at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## License

This project is proprietary software.
