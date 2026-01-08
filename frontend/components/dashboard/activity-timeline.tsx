'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn, formatRelativeTime, getStatusColor } from '@/lib/utils'
import { Rocket, Search, TestTube2, GitPullRequest, Loader2 } from 'lucide-react'
import { analytics } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'

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

export function ActivityTimeline() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { accessToken } = useAuthStore()

  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken) {
        setIsLoading(false)
        return
      }

      try {
        const response = await analytics.getRecentActivity(6)
        setActivities(response.data.activities || [])
      } catch (error) {
        console.error('Failed to fetch activities:', error)
        setActivities([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [accessToken])

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : activities.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            No recent activity
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = activityIcons[activity.type] || Rocket
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
        )}
      </CardContent>
    </Card>
  )
}
