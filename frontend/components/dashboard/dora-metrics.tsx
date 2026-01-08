'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  Rocket,
  Clock,
  AlertTriangle,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'
import { analytics } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'

interface MetricValue {
  value: number
  unit: string
  change: number
  trend: 'up' | 'down' | 'stable'
}

interface DoraMetricsData {
  deployment_frequency: MetricValue
  lead_time: MetricValue
  change_failure_rate: MetricValue
  mttr: MetricValue
}

const metricConfig = {
  deployment_frequency: {
    label: 'Deployment Frequency',
    icon: Rocket,
    description: 'How often code is deployed',
    goodTrend: 'up',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  lead_time: {
    label: 'Lead Time',
    icon: Clock,
    description: 'Time from commit to production',
    goodTrend: 'down',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  change_failure_rate: {
    label: 'Change Failure Rate',
    icon: AlertTriangle,
    description: 'Percentage of failed deployments',
    goodTrend: 'down',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
  },
  mttr: {
    label: 'Mean Time to Recovery',
    icon: RefreshCw,
    description: 'Time to restore service',
    goodTrend: 'down',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
}

function TrendIndicator({ trend, change, goodTrend }: { trend: string; change: number; goodTrend: string }) {
  const isGood = (trend === goodTrend) || (trend === 'stable')
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus

  return (
    <div className={cn(
      'flex items-center gap-1 text-xs',
      isGood ? 'text-green-500' : 'text-red-500'
    )}>
      <TrendIcon className="h-3 w-3" />
      <span>{change > 0 ? '+' : ''}{change}%</span>
    </div>
  )
}

export function DoraMetrics() {
  const [metrics, setMetrics] = useState<DoraMetricsData | null>(null)
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
        const response = await analytics.getDoraMetrics(period)
        setMetrics(response.data.metrics || null)
      } catch (error) {
        console.error('Failed to fetch DORA metrics:', error)
        setMetrics(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [accessToken, period])

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">DORA Metrics</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Key DevOps performance indicators
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
            No DORA metrics available
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {(Object.keys(metricConfig) as Array<keyof typeof metricConfig>).map((key) => {
              const config = metricConfig[key]
              const metric = metrics[key]
              const Icon = config.icon

              return (
                <div
                  key={key}
                  className="flex flex-col p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn('p-2 rounded-md', config.bg)}>
                      <Icon className={cn('h-4 w-4', config.color)} />
                    </div>
                    <span className="text-sm font-medium">{config.label}</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold">
                        {metric.value}
                        <span className="text-sm font-normal text-muted-foreground ml-1">
                          {metric.unit}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {config.description}
                      </p>
                    </div>
                    <TrendIndicator
                      trend={metric.trend}
                      change={metric.change}
                      goodTrend={config.goodTrend}
                    />
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
