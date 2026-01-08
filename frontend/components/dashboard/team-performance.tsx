'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  Users,
  Rocket,
  CheckCircle2,
  Code,
  TestTube,
  GitBranch,
  Loader2,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { analytics } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'

interface TeamMetrics {
  team_size: number
  total_deployments: number
  successful_deployments: number
  deployment_success_rate: number
  deployment_change: number
  code_reviews: number
  review_change: number
  test_pass_rate: number
  pass_rate_change: number
  active_repositories: number
}

export function TeamPerformance() {
  const [metrics, setMetrics] = useState<TeamMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [period, setPeriod] = useState('30d')
  const { accessToken } = useAuthStore()

  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken) {
        setIsLoading(false)
        return
      }

      try {
        const response = await analytics.getTeamPerformance(period)
        setMetrics(response.data.metrics || null)
      } catch (error) {
        console.error('Failed to fetch team performance:', error)
        setMetrics(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [accessToken, period])

  const statCards = metrics ? [
    {
      label: 'Team Size',
      value: metrics.team_size,
      icon: Users,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Active Repos',
      value: metrics.active_repositories,
      icon: GitBranch,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
    },
    {
      label: 'Total Deployments',
      value: metrics.total_deployments,
      change: metrics.deployment_change,
      icon: Rocket,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
    },
    {
      label: 'Success Rate',
      value: `${metrics.deployment_success_rate}%`,
      icon: CheckCircle2,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    },
    {
      label: 'Code Reviews',
      value: metrics.code_reviews,
      change: metrics.review_change,
      icon: Code,
      color: 'text-cyan-500',
      bg: 'bg-cyan-500/10',
    },
    {
      label: 'Test Pass Rate',
      value: `${metrics.test_pass_rate}%`,
      change: metrics.pass_rate_change,
      icon: TestTube,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
  ] : []

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Team Performance</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of team activity and success metrics
          </p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="text-sm border rounded-md px-2 py-1 bg-background"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !metrics ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            No team data available
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            {statCards.map((stat) => {
              const Icon = stat.icon
              return (
                <div
                  key={stat.label}
                  className="flex flex-col p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn('p-1.5 rounded-md', stat.bg)}>
                      <Icon className={cn('h-4 w-4', stat.color)} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    {stat.change !== undefined && (
                      <div className={cn(
                        'flex items-center gap-0.5 text-xs',
                        stat.change >= 0 ? 'text-green-500' : 'text-red-500'
                      )}>
                        {stat.change >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        <span>{stat.change > 0 ? '+' : ''}{stat.change}%</span>
                      </div>
                    )}
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
