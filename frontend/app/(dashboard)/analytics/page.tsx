'use client'

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
import { TrendingUp, TrendingDown, Clock, Rocket, Bug, RefreshCw } from 'lucide-react'

// DORA Metrics Data
const deploymentFrequencyData = [
  { week: 'W1', deploys: 45 },
  { week: 'W2', deploys: 52 },
  { week: 'W3', deploys: 48 },
  { week: 'W4', deploys: 61 },
  { week: 'W5', deploys: 58 },
  { week: 'W6', deploys: 72 },
]

const leadTimeData = [
  { week: 'W1', hours: 24 },
  { week: 'W2', hours: 22 },
  { week: 'W3', hours: 18 },
  { week: 'W4', hours: 16 },
  { week: 'W5', hours: 14 },
  { week: 'W6', hours: 12 },
]

const mttrData = [
  { week: 'W1', minutes: 45 },
  { week: 'W2', minutes: 38 },
  { week: 'W3', minutes: 42 },
  { week: 'W4', minutes: 35 },
  { week: 'W5', minutes: 28 },
  { week: 'W6', minutes: 22 },
]

const changeFailureData = [
  { week: 'W1', rate: 8 },
  { week: 'W2', rate: 6 },
  { week: 'W3', rate: 7 },
  { week: 'W4', rate: 5 },
  { week: 'W5', rate: 4 },
  { week: 'W6', rate: 3 },
]

const teamPerformanceData = [
  { team: 'Platform', deploys: 45, passRate: 96, coverage: 85 },
  { team: 'Backend', deploys: 38, passRate: 94, coverage: 82 },
  { team: 'Frontend', deploys: 52, passRate: 98, coverage: 78 },
  { team: 'Mobile', deploys: 28, passRate: 92, coverage: 75 },
  { team: 'Data', deploys: 22, passRate: 95, coverage: 88 },
]

const trendData = [
  { month: 'Jul', deployments: 180, vulnerabilities: 45, testPass: 92 },
  { month: 'Aug', deployments: 210, vulnerabilities: 38, testPass: 94 },
  { month: 'Sep', deployments: 245, vulnerabilities: 32, testPass: 95 },
  { month: 'Oct', deployments: 280, vulnerabilities: 28, testPass: 96 },
  { month: 'Nov', deployments: 310, vulnerabilities: 22, testPass: 97 },
  { month: 'Dec', deployments: 350, vulnerabilities: 18, testPass: 98 },
]

export default function AnalyticsPage() {
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
                    <p className="text-2xl font-bold">72/week</p>
                    <div className="flex items-center text-green-500 text-sm">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      +24% vs last month
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
                    <p className="text-2xl font-bold">12 hours</p>
                    <div className="flex items-center text-green-500 text-sm">
                      <TrendingDown className="h-4 w-4 mr-1" />
                      -50% vs last month
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
                    <p className="text-2xl font-bold">22 min</p>
                    <div className="flex items-center text-green-500 text-sm">
                      <TrendingDown className="h-4 w-4 mr-1" />
                      -51% vs last month
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
                    <p className="text-2xl font-bold">3%</p>
                    <div className="flex items-center text-green-500 text-sm">
                      <TrendingDown className="h-4 w-4 mr-1" />
                      -62% vs last month
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
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deploymentFrequencyData}>
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
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lead Time for Changes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={leadTimeData}>
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
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mean Time to Recovery</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mttrData}>
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
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Change Failure Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={changeFailureData}>
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
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="teams" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {teamPerformanceData.map((team) => (
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
                      <Progress value={team.deploys / 0.6} className="h-2" />
                      <Progress
                        value={team.passRate}
                        className="h-2"
                        indicatorClassName="bg-green-500"
                      />
                      <Progress
                        value={team.coverage}
                        className="h-2"
                        indicatorClassName="bg-blue-500"
                      />
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
                    <BarChart data={teamPerformanceData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" />
                      <YAxis dataKey="team" type="category" width={80} />
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
                    <BarChart data={teamPerformanceData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis dataKey="team" type="category" width={80} />
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
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>6-Month Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
