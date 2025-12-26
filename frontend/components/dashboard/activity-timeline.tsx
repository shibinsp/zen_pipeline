'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn, formatRelativeTime, getStatusColor } from '@/lib/utils'
import { Rocket, Search, TestTube2, GitPullRequest } from 'lucide-react'

interface Activity {
  id: string
  type: 'deployment' | 'scan' | 'test' | 'pr'
  title: string
  description: string
  status: string
  timestamp: string
  user?: string
}

const activityIcons = {
  deployment: Rocket,
  scan: Search,
  test: TestTube2,
  pr: GitPullRequest,
}

// Demo activities
const demoActivities: Activity[] = [
  {
    id: '1',
    type: 'deployment',
    title: 'Production Deployment',
    description: 'api-service v2.4.1 deployed to production',
    status: 'completed',
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    user: 'John Doe',
  },
  {
    id: '2',
    type: 'scan',
    title: 'Security Scan',
    description: 'SAST scan completed for frontend-app',
    status: 'completed',
    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
  },
  {
    id: '3',
    type: 'test',
    title: 'Test Suite',
    description: '248/250 tests passed for user-service',
    status: 'failed',
    timestamp: new Date(Date.now() - 90 * 60000).toISOString(),
  },
  {
    id: '4',
    type: 'deployment',
    title: 'Staging Deployment',
    description: 'payment-service v1.8.0 deployed to staging',
    status: 'in_progress',
    timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
    user: 'Jane Smith',
  },
  {
    id: '5',
    type: 'pr',
    title: 'PR Analysis',
    description: 'Risk assessment completed for PR #423',
    status: 'completed',
    timestamp: new Date(Date.now() - 180 * 60000).toISOString(),
  },
  {
    id: '6',
    type: 'scan',
    title: 'Dependency Scan',
    description: '3 vulnerabilities found in backend-api',
    status: 'warning',
    timestamp: new Date(Date.now() - 240 * 60000).toISOString(),
  },
]

export function ActivityTimeline() {
  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {demoActivities.map((activity) => {
            const Icon = activityIcons[activity.type]
            return (
              <div key={activity.id} className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{activity.title}</p>
                    <Badge
                      variant="outline"
                      className={cn('text-xs', getStatusColor(activity.status))}
                    >
                      {activity.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {activity.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeTime(activity.timestamp)}
                    {activity.user && ` by ${activity.user}`}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
