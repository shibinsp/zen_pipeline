'use client'

import { useState, useEffect } from 'react'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { ActivityTimeline } from '@/components/dashboard/activity-timeline'
import { RiskTrendChart } from '@/components/dashboard/risk-trend-chart'
import { HealthStatus } from '@/components/dashboard/health-status'
import { VulnerabilitySummary } from '@/components/dashboard/vulnerability-summary'
import { TestEfficiency } from '@/components/dashboard/test-efficiency'
import { DoraMetrics } from '@/components/dashboard/dora-metrics'
import { TeamPerformance } from '@/components/dashboard/team-performance'
import { admin } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Loader2 } from 'lucide-react'

interface DashboardStats {
  deployments_today: number
  active_scans: number
  test_pass_rate: number
  open_vulnerabilities: number
  system_health: string
  trends: {
    deployments: { value: number; direction: 'up' | 'down' }
    vulnerabilities: { value: number; direction: 'up' | 'down' }
    test_pass_rate: { value: number; direction: 'up' | 'down' }
  }
}

// Default stats for when API fails or user is not logged in
const defaultStats: DashboardStats = {
  deployments_today: 0,
  active_scans: 0,
  test_pass_rate: 0,
  open_vulnerabilities: 0,
  system_health: 'unknown',
  trends: {
    deployments: { value: 0, direction: 'up' },
    vulnerabilities: { value: 0, direction: 'down' },
    test_pass_rate: { value: 0, direction: 'up' },
  },
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(defaultStats)
  const [isLoading, setIsLoading] = useState(true)
  const { accessToken, user } = useAuthStore()

  useEffect(() => {
    const fetchStats = async () => {
      if (!accessToken) {
        setIsLoading(false)
        return
      }

      try {
        const response = await admin.getDashboardStats()
        setStats({
          deployments_today: response.data.deployments_today || 0,
          active_scans: response.data.active_scans || 0,
          test_pass_rate: response.data.test_pass_rate || 0,
          open_vulnerabilities: response.data.open_vulnerabilities || 0,
          system_health: response.data.system_health || 'healthy',
          trends: response.data.trends || defaultStats.trends,
        })
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error)
        // Keep default stats on error
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()

    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [accessToken])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your DevOps pipeline health and metrics
          </p>
        </div>
        {user && (
          <div className="text-sm text-muted-foreground">
            Welcome back, <span className="font-medium text-foreground">{user.name}</span>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <StatsCards stats={stats} />

          {/* DORA Metrics Section */}
          <DoraMetrics />

          {/* Team Performance Section */}
          <TeamPerformance />

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
        </>
      )}
    </div>
  )
}
