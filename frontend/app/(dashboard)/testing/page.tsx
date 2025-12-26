'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn, formatDuration, formatRelativeTime } from '@/lib/utils'
import {
  TestTube2,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Play,
  RotateCcw,
} from 'lucide-react'

// Demo data
const testRuns = [
  {
    id: '1',
    repository: 'api-service',
    branch: 'main',
    status: 'completed',
    total_tests: 1250,
    selected_tests: 312,
    passed: 308,
    failed: 4,
    skipped: 0,
    duration_ms: 145000,
    time_saved_percent: 75,
    created_at: new Date(Date.now() - 30 * 60000).toISOString(),
  },
  {
    id: '2',
    repository: 'frontend-app',
    branch: 'feature/auth',
    status: 'running',
    total_tests: 890,
    selected_tests: 156,
    passed: 120,
    failed: 0,
    skipped: 0,
    duration_ms: 0,
    time_saved_percent: 82,
    created_at: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: '3',
    repository: 'user-service',
    branch: 'main',
    status: 'failed',
    total_tests: 650,
    selected_tests: 98,
    passed: 92,
    failed: 6,
    skipped: 0,
    duration_ms: 89000,
    time_saved_percent: 85,
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
]

const flakyTests = [
  {
    id: '1',
    test_name: 'test_user_authentication_flow',
    test_file: 'tests/integration/test_auth.py',
    flakiness_score: 0.45,
    total_runs: 156,
    failure_count: 23,
    status: 'active',
    root_cause: 'Race condition in async operations',
  },
  {
    id: '2',
    test_name: 'test_payment_processing_timeout',
    test_file: 'tests/e2e/test_payment.py',
    flakiness_score: 0.32,
    total_runs: 89,
    failure_count: 12,
    status: 'quarantined',
    root_cause: 'External API timeout inconsistency',
  },
  {
    id: '3',
    test_name: 'test_notification_delivery',
    test_file: 'tests/integration/test_notifications.py',
    flakiness_score: 0.18,
    total_runs: 245,
    failure_count: 8,
    status: 'active',
    root_cause: 'Database connection pool exhaustion',
  },
]

const selectedTests = [
  { name: 'test_user_login', file: 'test_auth.py', priority: 0.95, probability: 0.82 },
  { name: 'test_create_user', file: 'test_users.py', priority: 0.91, probability: 0.75 },
  { name: 'test_update_profile', file: 'test_users.py', priority: 0.88, probability: 0.68 },
  { name: 'test_api_rate_limit', file: 'test_api.py', priority: 0.85, probability: 0.62 },
  { name: 'test_validation_error', file: 'test_validation.py', priority: 0.82, probability: 0.55 },
]

export default function TestingPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test Intelligence</h1>
          <p className="text-muted-foreground">
            ML-powered test selection and flaky test management
          </p>
        </div>
        <Button>
          <Play className="mr-2 h-4 w-4" />
          Run Tests
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Time Saved Today</p>
                <p className="text-2xl font-bold text-green-500">4.5 hrs</p>
              </div>
              <Clock className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Selection Accuracy</p>
                <p className="text-2xl font-bold">92%</p>
              </div>
              <Zap className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pass Rate</p>
                <p className="text-2xl font-bold">96.5%</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Flaky Tests</p>
                <p className="text-2xl font-bold text-orange-500">12</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="runs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="runs">Test Runs</TabsTrigger>
          <TabsTrigger value="selection">Test Selection</TabsTrigger>
          <TabsTrigger value="flaky">Flaky Tests</TabsTrigger>
          <TabsTrigger value="coverage">Coverage</TabsTrigger>
        </TabsList>

        <TabsContent value="runs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Test Runs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {testRuns.map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          'p-2 rounded-lg',
                          run.status === 'completed' && 'bg-green-100 dark:bg-green-900/30',
                          run.status === 'running' && 'bg-blue-100 dark:bg-blue-900/30',
                          run.status === 'failed' && 'bg-red-100 dark:bg-red-900/30'
                        )}
                      >
                        {run.status === 'completed' && (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        )}
                        {run.status === 'running' && (
                          <RotateCcw className="h-5 w-5 text-blue-500 animate-spin" />
                        )}
                        {run.status === 'failed' && (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium">{run.repository}</h4>
                        <p className="text-sm text-muted-foreground">
                          Branch: {run.branch}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Selected</p>
                        <p className="font-medium">
                          {run.selected_tests}/{run.total_tests}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Results</p>
                        <div className="flex items-center gap-2">
                          <span className="text-green-500">{run.passed}</span>
                          <span className="text-muted-foreground">/</span>
                          <span className="text-red-500">{run.failed}</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Time Saved</p>
                        <Badge variant="success">{run.time_saved_percent}%</Badge>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Duration</p>
                        <p className="font-medium">
                          {run.duration_ms > 0 ? formatDuration(run.duration_ms) : 'Running...'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="selection" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>ML Test Selection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Tests Selected</span>
                      <span className="text-2xl font-bold">156 / 890</span>
                    </div>
                    <Progress value={17.5} className="h-2" />
                    <p className="text-sm text-muted-foreground mt-2">
                      82.5% reduction in test suite
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Top Selected Tests</h4>
                    {selectedTests.map((test, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-sm">{test.name}</p>
                          <p className="text-xs text-muted-foreground">{test.file}</p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline">
                            Priority: {(test.priority * 100).toFixed(0)}%
                          </Badge>
                          <Badge variant="secondary">
                            Fail: {(test.probability * 100).toFixed(0)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Selection Factors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Code Change Proximity</span>
                    <span className="font-medium">High</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Historical Failure Rate</span>
                    <span className="font-medium">12%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Test Execution Time</span>
                    <span className="font-medium">Optimized</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Business Criticality</span>
                    <span className="font-medium">High</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Dependency Chain Impact</span>
                    <span className="font-medium">Medium</span>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 text-green-500">
                      <TrendingUp className="h-5 w-5" />
                      <span className="font-medium">Model Confidence: 94%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="flaky" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Flaky Test Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {flakyTests.map((test) => (
                  <div
                    key={test.id}
                    className="p-4 border rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{test.test_name}</h4>
                        <p className="text-sm text-muted-foreground">{test.test_file}</p>
                      </div>
                      <Badge
                        variant={test.status === 'quarantined' ? 'warning' : 'secondary'}
                      >
                        {test.status}
                      </Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Flakiness Score</p>
                        <p className="font-medium">{(test.flakiness_score * 100).toFixed(0)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Failures</p>
                        <p className="font-medium">{test.failure_count} / {test.total_runs}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Root Cause</p>
                        <p className="font-medium text-sm">{test.root_cause}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" size="sm">View Details</Button>
                      <Button variant="outline" size="sm">Quarantine</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coverage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Coverage Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-4">
                <div className="text-center">
                  <p className="text-4xl font-bold text-green-500">78.5%</p>
                  <p className="text-sm text-muted-foreground">Overall Coverage</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold">82.3%</p>
                  <p className="text-sm text-muted-foreground">Line Coverage</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold">71.2%</p>
                  <p className="text-sm text-muted-foreground">Branch Coverage</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold">85.6%</p>
                  <p className="text-sm text-muted-foreground">Function Coverage</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
