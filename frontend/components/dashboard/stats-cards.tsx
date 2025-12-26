'use client'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  Rocket,
  Search,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    direction: 'up' | 'down'
  }
  icon: React.ElementType
  iconColor?: string
}

function StatCard({ title, value, change, icon: Icon, iconColor }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold mt-1">{value}</h3>
            {change && (
              <div className="flex items-center mt-1">
                {change.direction === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                )}
                <span
                  className={cn(
                    'text-sm',
                    change.direction === 'up' ? 'text-green-500' : 'text-red-500'
                  )}
                >
                  {change.value}%
                </span>
              </div>
            )}
          </div>
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-lg',
              iconColor || 'bg-primary/10'
            )}
          >
            <Icon className={cn('h-6 w-6', iconColor ? 'text-white' : 'text-primary')} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface StatsCardsProps {
  stats: {
    deployments_today: number
    active_scans: number
    test_pass_rate: number
    open_vulnerabilities: number
    trends: {
      deployments: { value: number; direction: 'up' | 'down' }
      vulnerabilities: { value: number; direction: 'up' | 'down' }
      test_pass_rate: { value: number; direction: 'up' | 'down' }
    }
  }
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Deployments Today"
        value={stats.deployments_today}
        change={stats.trends.deployments}
        icon={Rocket}
        iconColor="bg-blue-500"
      />
      <StatCard
        title="Active Scans"
        value={stats.active_scans}
        icon={Search}
        iconColor="bg-purple-500"
      />
      <StatCard
        title="Test Pass Rate"
        value={`${stats.test_pass_rate}%`}
        change={stats.trends.test_pass_rate}
        icon={CheckCircle2}
        iconColor="bg-green-500"
      />
      <StatCard
        title="Open Vulnerabilities"
        value={stats.open_vulnerabilities}
        change={stats.trends.vulnerabilities}
        icon={AlertTriangle}
        iconColor="bg-orange-500"
      />
    </div>
  )
}
