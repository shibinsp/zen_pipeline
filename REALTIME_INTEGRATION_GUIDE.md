# Real-Time Data Integration Guide for Zen Pipeline AI

## Current Status

The application now has:
- Working authentication (login/register)
- Database seeded with test data (users, organizations, repositories, scans, vulnerabilities, deployments)
- Admin pages fetching real data from API
- Dashboard displaying live statistics from the database

## Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Platform Admin | admin@zenpipeline.ai | Admin123 |
| Demo User | demo@zenpipeline.ai | demo123 |
| Org Admin | john@nxzen.com | Password123 |
| Team Lead | jane@nxzen.com | Password123 |
| Developer | mike@nxzen.com | Password123 |

---

## Suggestions for Real-Time Data Integration

### 1. WebSocket Integration for Live Updates

**Purpose**: Push real-time updates to the frontend without polling.

**Implementation**:

```python
# backend/app/core/websocket.py
from fastapi import WebSocket
from typing import List
import json

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

manager = ConnectionManager()
```

**Events to broadcast**:
- New deployment started/completed/failed
- Scan results available
- New vulnerability detected
- Test run completed
- User login/logout

### 2. Server-Sent Events (SSE) - Simpler Alternative

**Advantages over WebSockets**:
- Simpler to implement
- Works over HTTP
- Auto-reconnection built-in

```python
# backend/app/api/v1/endpoints/events.py
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
import asyncio

router = APIRouter()

async def event_generator():
    while True:
        # Check for new events in database
        events = await get_pending_events()
        for event in events:
            yield f"data: {json.dumps(event)}\n\n"
        await asyncio.sleep(1)

@router.get("/stream")
async def event_stream():
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream"
    )
```

### 3. Redis Pub/Sub for Event Distribution

**Purpose**: Distribute events across multiple backend instances.

```python
# backend/app/core/events.py
import redis
import json

redis_client = redis.Redis(host='redis', port=6379)

def publish_event(channel: str, event: dict):
    redis_client.publish(channel, json.dumps(event))

def subscribe_events(channel: str):
    pubsub = redis_client.pubsub()
    pubsub.subscribe(channel)
    return pubsub
```

**Channels to use**:
- `deployments`: Deployment status changes
- `scans`: Scan progress and results
- `alerts`: Security alerts and notifications
- `metrics`: Real-time metrics updates

### 4. Polling Optimization

For simpler implementation, optimize the current polling approach:

```typescript
// frontend/lib/hooks/use-realtime-data.ts
import { useQuery } from '@tanstack/react-query'

export function useRealtimeStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => admin.getDashboardStats(),
    refetchInterval: 10000, // 10 seconds
    staleTime: 5000,
  })
}

export function useRealtimeDeployments() {
  return useQuery({
    queryKey: ['deployments'],
    queryFn: () => deployments.list({ status: 'in_progress' }),
    refetchInterval: 5000, // 5 seconds for active deployments
  })
}
```

### 5. Optimistic Updates

Update UI immediately, then sync with server:

```typescript
// frontend/lib/hooks/use-optimistic-update.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useOptimisticDeployment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deployments.create,
    onMutate: async (newDeployment) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['deployments'] })

      // Snapshot previous value
      const previous = queryClient.getQueryData(['deployments'])

      // Optimistically update
      queryClient.setQueryData(['deployments'], (old: any) => ({
        ...old,
        items: [{ ...newDeployment, status: 'pending' }, ...old.items]
      }))

      return { previous }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['deployments'], context?.previous)
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['deployments'] })
    },
  })
}
```

### 6. Background Job Processing

For long-running tasks (scans, analysis):

```python
# backend/app/services/background_tasks.py
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    'zen_pipeline',
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

@celery_app.task
def run_security_scan(repository_id: str, commit_sha: str):
    # Long-running scan logic
    scan = create_scan(repository_id, commit_sha)

    # Update progress
    update_scan_progress(scan.id, 25, "Cloning repository...")
    clone_repository(repository_id)

    update_scan_progress(scan.id, 50, "Running SAST analysis...")
    run_sast_analysis(scan.id)

    update_scan_progress(scan.id, 75, "Analyzing dependencies...")
    run_dependency_scan(scan.id)

    update_scan_progress(scan.id, 100, "Complete")
    finalize_scan(scan.id)

    # Publish completion event
    publish_event('scans', {
        'type': 'scan_complete',
        'scan_id': str(scan.id),
        'repository_id': repository_id
    })
```

### 7. Webhook Integration

For external integrations (GitHub, GitLab, Slack):

```python
# backend/app/api/v1/endpoints/webhooks.py
from fastapi import APIRouter, Request, HTTPException
import hmac
import hashlib

router = APIRouter()

@router.post("/github")
async def github_webhook(request: Request):
    payload = await request.body()
    signature = request.headers.get("X-Hub-Signature-256")

    # Verify webhook signature
    if not verify_github_signature(payload, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")

    event = request.headers.get("X-GitHub-Event")
    data = await request.json()

    if event == "push":
        # Trigger scan on push
        await trigger_scan_for_push(data)
    elif event == "pull_request":
        # Analyze PR
        await analyze_pull_request(data)

    return {"status": "received"}
```

### 8. Database Change Notifications (PostgreSQL)

Use PostgreSQL LISTEN/NOTIFY for real-time updates:

```python
# backend/app/core/db_listener.py
import asyncpg
import asyncio

async def listen_for_changes():
    conn = await asyncpg.connect(settings.DATABASE_URL)

    async def handle_notification(connection, pid, channel, payload):
        event = json.loads(payload)
        await manager.broadcast(event)

    await conn.add_listener('data_changes', handle_notification)

    # Keep connection alive
    while True:
        await asyncio.sleep(1)
```

```sql
-- Create trigger for notifications
CREATE OR REPLACE FUNCTION notify_data_change()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('data_changes', json_build_object(
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'id', NEW.id
    )::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deployments_notify
AFTER INSERT OR UPDATE ON deployments
FOR EACH ROW EXECUTE FUNCTION notify_data_change();
```

---

## Recommended Implementation Order

### Phase 1: Immediate Improvements (1-2 days)
1. Add React Query for smart polling
2. Implement optimistic updates for better UX
3. Add loading skeletons instead of spinners

### Phase 2: Real-time Foundation (3-5 days)
1. Set up Redis properly
2. Implement SSE for live updates
3. Add background job processing with Celery

### Phase 3: Full Real-time (1-2 weeks)
1. WebSocket integration
2. PostgreSQL LISTEN/NOTIFY
3. Webhook integrations (GitHub, Slack)

### Phase 4: Advanced Features
1. Real-time collaboration
2. Live deployment logs streaming
3. Real-time code analysis feedback

---

## Architecture for Real-Time

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                          │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────────┐  │
│  │ React Query │   │  SSE Client │   │ WebSocket Client        │  │
│  │ (Polling)   │   │ (Events)    │   │ (Bi-directional)        │  │
│  └──────┬──────┘   └──────┬──────┘   └───────────┬─────────────┘  │
└─────────┼─────────────────┼──────────────────────┼──────────────────┘
          │                 │                      │
          ▼                 ▼                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         BACKEND (FastAPI)                           │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────────┐  │
│  │ REST API    │   │ SSE Stream  │   │ WebSocket Handler       │  │
│  │ Endpoints   │   │ Endpoint    │   │                         │  │
│  └──────┬──────┘   └──────┬──────┘   └───────────┬─────────────┘  │
│         │                 │                      │                 │
│         └─────────────────┴──────────────────────┘                 │
│                           │                                        │
│                           ▼                                        │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    Event Bus (Redis Pub/Sub)                 │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                           │                                        │
│         ┌─────────────────┼─────────────────┐                     │
│         ▼                 ▼                 ▼                     │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐             │
│  │ Background  │   │ Webhook     │   │ Scheduler   │             │
│  │ Workers     │   │ Handlers    │   │ (Cron jobs) │             │
│  │ (Celery)    │   │             │   │             │             │
│  └─────────────┘   └─────────────┘   └─────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                       │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐              │
│  │ PostgreSQL  │   │ Redis       │   │ External    │              │
│  │ (Primary)   │   │ (Cache/PubSub)│ │ APIs        │              │
│  └─────────────┘   └─────────────┘   └─────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Quick Wins for Immediate Improvement

### 1. Add Loading States
Already done in dashboard - add to all pages.

### 2. Auto-refresh Active Data
```typescript
// Refresh deployments every 5 seconds when there are in-progress items
const hasActiveDeployments = deployments.some(d => d.status === 'in_progress')
const refetchInterval = hasActiveDeployments ? 5000 : 30000
```

### 3. Toast Notifications
Show real-time notifications for important events:
```typescript
// On new deployment completed
toast.success('Deployment v2.4.1 completed successfully!')

// On vulnerability detected
toast.error('Critical vulnerability detected in api-service')
```

### 4. Optimistic UI Updates
Update UI immediately, rollback on error.

---

## Summary

Your application is now functional with:
- Working authentication
- Real database with seed data
- Admin pages with live API data
- Dashboard with real statistics

For real-time capabilities, start with:
1. React Query for smart caching and polling
2. SSE for server-to-client updates
3. Redis for event distribution

This will give you a great real-time experience without the complexity of full WebSocket implementation.
