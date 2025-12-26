'use client'

import { StatsCards } from '@/components/dashboard/stats-cards'
import { ActivityTimeline } from '@/components/dashboard/activity-timeline'
import { RiskTrendChart } from '@/components/dashboard/risk-trend-chart'
import { HealthStatus } from '@/components/dashboard/health-status'
import { VulnerabilitySummary } from '@/components/dashboard/vulnerability-summary'
import { TestEfficiency } from '@/components/dashboard/test-efficiency'

// Demo stats
const stats = {
  deployments_today: 12,
  active_scans: 3,
  test_pass_rate: 94.5,
  open_vulnerabilities: 88,
  system_health: 'healthy',
  trends: {
    deployments: { value: 12, direction: 'up' as const },
    vulnerabilities: { value: -5, direction: 'down' as const },
    test_pass_rate: { value: 2.3, direction: 'up' as const },
  },
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your DevOps pipeline health and metrics
        </p>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-3">
        <RiskTrendChart />
        <ActivityTimeline />
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 md:grid-cols-3">
        <VulnerabilitySummary />
        <TestEfficiency />
        <HealthStatus />
      </div>
    </div>
  )
}
