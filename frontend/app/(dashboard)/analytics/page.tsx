'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, Clock, Rocket, Bug, RefreshCw, Loader2 } from 'lucide-react'
import { analytics } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'

interface DoraHistoryData {
  deployment_frequency: Array<{ week: string; deploys: number }>
  lead_time: Array<{ week: string; hours: number }>
  mttr: Array<{ week: string; minutes: number }>
  change_failure_rate: Array<{ week: string; rate: number }>
  summary: {
    deployment_frequency: { value: number; unit: string; change: number }
    lead_time: { value: number; unit: string; change: number }
    mttr: { value: number; unit: string; change: number }
    change_failure_rate: { value: number; unit: string; change: number }
  }
}

interface TeamData {
  team: string
  deploys: number
  passRate: number
  coverage: number
}

interface TrendData {
  month: string
  deployments: number
  vulnerabilities: number
  testPass: number
}

export default function AnalyticsPage() {
  const [doraData, setDoraData] = useState<DoraHistoryData | null>(null)
  const [teamData, setTeamData] = useState<TeamData[]>([])
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { accessToken } = useAuthStore()

  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken) {
        setIsLoading(false)
        return
      }

      try {
        const [doraRes, teamRes, trendRes] = await Promise.all([
          analytics.getDoraHistory(6),
          analytics.getTeamMetrics(),
          analytics.getTrends(6),
        ])

        setDoraData(doraRes.data)
        setTeamData(teamRes.data.data || [])
        setTrendData(trendRes.data.data || [])
      } catch (error) {
        console.error('Failed to fetch analytics data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [accessToken])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const summary = doraData?.summary

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          DORA metrics, team performance, and trend analysis
        </p>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="dora" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dora">DORA Metrics</TabsTrigger>
          <TabsTrigger value="teams">Team Performance</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="dora" className="space-y-4">
          {/* DORA Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Deployment Frequency</p>
                    <p className="text-2xl font-bold">
                      {summary?.deployment_frequency.value || 0}{summary?.deployment_frequency.unit || '/week'}
                    </p>
                    <div className={`flex items-center text-sm ${(summary?.deployment_frequency.change || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {(summary?.deployment_frequency.change || 0) >= 0 ? (
                        <TrendingUp className="h-4 w-4 mr-1" />
                      ) : (
                        <TrendingDown className="h-4 w-4 mr-1" />
                      )}
                      {(summary?.deployment_frequency.change || 0) > 0 ? '+' : ''}{summary?.deployment_frequency.change || 0}% vs last week
                    </div>
                  </div>
                  <Rocket className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Lead Time for Changes</p>
                    <p className="text-2xl font-bold">
                      {summary?.lead_time.value || 0} {summary?.lead_time.unit || 'hours'}
                    </p>
                    <div className={`flex items-center text-sm ${(summary?.lead_time.change || 0) <= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {(summary?.lead_time.change || 0) <= 0 ? (
                        <TrendingDown className="h-4 w-4 mr-1" />
                      ) : (
                        <TrendingUp className="h-4 w-4 mr-1" />
                      )}
                      {summary?.lead_time.change || 0}% vs last week
                    </div>
                  </div>
                  <Clock className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">MTTR</p>
                    <p className="text-2xl font-bold">
                      {summary?.mttr.value || 0} {summary?.mttr.unit || 'min'}
                    </p>
                    <div className={`flex items-center text-sm ${(summary?.mttr.change || 0) <= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {(summary?.mttr.change || 0) <= 0 ? (
                        <TrendingDown className="h-4 w-4 mr-1" />
                      ) : (
                        <TrendingUp className="h-4 w-4 mr-1" />
                      )}
                      {summary?.mttr.change || 0}% vs last week
                    </div>
                  </div>
                  <RefreshCw className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Change Failure Rate</p>
                    <p className="text-2xl font-bold">
                      {summary?.change_failure_rate.value || 0}{summary?.change_failure_rate.unit || '%'}
                    </p>
                    <div className={`flex items-center text-sm ${(summary?.change_failure_rate.change || 0) <= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {(summary?.change_failure_rate.change || 0) <= 0 ? (
                        <TrendingDown className="h-4 w-4 mr-1" />
                      ) : (
                        <TrendingUp className="h-4 w-4 mr-1" />
                      )}
                      {(summary?.change_failure_rate.change || 0) > 0 ? '+' : ''}{summary?.change_failure_rate.change || 0}% vs last week
                    </div>
                  </div>
                  <Bug className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* DORA Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Deployment Frequency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  {doraData?.deployment_frequency && doraData.deployment_frequency.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={doraData.deployment_frequency}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="week" />
                        <YAxis />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                          }}
                        />
                        <Bar dataKey="deploys" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No deployment data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lead Time for Changes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  {doraData?.lead_time && doraData.lead_time.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={doraData.lead_time}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="week" />
                        <YAxis />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="hours"
                          stroke="#22c55e"
                          strokeWidth={2}
                          dot={{ fill: '#22c55e' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No lead time data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mean Time to Recovery</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  {doraData?.mttr && doraData.mttr.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={doraData.mttr}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="week" />
                        <YAxis />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="minutes"
                          stroke="#f97316"
                          strokeWidth={2}
                          dot={{ fill: '#f97316' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No MTTR data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Change Failure Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  {doraData?.change_failure_rate && doraData.change_failure_rate.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={doraData.change_failure_rate}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="week" />
                        <YAxis />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="rate"
                          stroke="#ef4444"
                          fill="#ef4444"
                          fillOpacity={0.2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No failure rate data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="teams" className="space-y-4">
          {teamData.length > 0 ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Team Performance Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {teamData.map((team) => (
                      <div key={team.team} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{team.team}</span>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <span>{team.deploys} deploys</span>
                            <span>{team.passRate}% pass rate</span>
                            <span>{team.coverage}% coverage</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <Progress value={Math.min(team.deploys * 2, 100)} className="h-2" />
                          <Progress value={team.passRate} className="h-2" />
                          <Progress value={team.coverage} className="h-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Deployments by Team</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={teamData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis type="number" />
                          <YAxis dataKey="team" type="category" width={100} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                            }}
                          />
                          <Bar dataKey="deploys" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Test Coverage by Team</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={teamData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis type="number" domain={[0, 100]} />
                          <YAxis dataKey="team" type="category" width={100} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                            }}
                          />
                          <Bar dataKey="coverage" fill="#22c55e" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              No team data available
            </div>
          )}
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>6-Month Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                        }}
                      />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="deployments"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        name="Deployments"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="vulnerabilities"
                        stroke="#ef4444"
                        strokeWidth={2}
                        name="Vulnerabilities"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="testPass"
                        stroke="#22c55e"
                        strokeWidth={2}
                        name="Test Pass Rate %"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No trend data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
