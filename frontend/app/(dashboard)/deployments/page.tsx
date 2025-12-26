'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn, formatRelativeTime, getRiskColor, getStatusColor } from '@/lib/utils'
import {
  Rocket,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  ArrowRight,
  GitBranch,
  Server,
  Activity,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'

// Demo data
const deployments = [
  {
    id: '1',
    repository: 'api-service',
    version: 'v2.4.1',
    environment: 'production',
    status: 'completed',
    risk_score: 32,
    deployed_by: 'John Doe',
    started_at: new Date(Date.now() - 45 * 60000).toISOString(),
    completed_at: new Date(Date.now() - 30 * 60000).toISOString(),
    duration_seconds: 900,
  },
  {
    id: '2',
    repository: 'frontend-app',
    version: 'v1.12.0',
    environment: 'staging',
    status: 'in_progress',
    risk_score: 45,
    deployed_by: 'Jane Smith',
    started_at: new Date(Date.now() - 10 * 60000).toISOString(),
    completed_at: null,
    duration_seconds: null,
  },
  {
    id: '3',
    repository: 'payment-gateway',
    version: 'v3.1.0',
    environment: 'production',
    status: 'failed',
    risk_score: 72,
    deployed_by: 'Mike Johnson',
    started_at: new Date(Date.now() - 3 * 3600000).toISOString(),
    completed_at: new Date(Date.now() - 2.5 * 3600000).toISOString(),
    duration_seconds: 1800,
  },
  {
    id: '4',
    repository: 'user-service',
    version: 'v2.0.5',
    environment: 'production',
    status: 'rolled_back',
    risk_score: 65,
    deployed_by: 'Sarah Wilson',
    started_at: new Date(Date.now() - 6 * 3600000).toISOString(),
    completed_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    duration_seconds: 600,
  },
]

const environments = [
  { name: 'Development', version: 'v2.5.0', status: 'healthy', health: 98 },
  { name: 'Staging', version: 'v2.4.2', status: 'healthy', health: 95 },
  { name: 'Production', version: 'v2.4.1', status: 'healthy', health: 99 },
]

const riskFactors = [
  { category: 'Code Changes', factor: '450 lines changed', score: 35, impact: 'medium' },
  { category: 'Database', factor: '2 migrations', score: 45, impact: 'high' },
  { category: 'Dependencies', factor: '3 new packages', score: 25, impact: 'low' },
  { category: 'Test Coverage', factor: '78% coverage', score: 20, impact: 'low' },
  { category: 'Historical', factor: '95% success rate', score: 15, impact: 'low' },
]

const statusIcons = {
  completed: CheckCircle2,
  in_progress: RotateCcw,
  failed: XCircle,
  rolled_back: RotateCcw,
  pending: Clock,
}

export default function DeploymentsPage() {
  const [selectedRiskScore] = useState(42)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deployments</h1>
          <p className="text-muted-foreground">
            Deployment risk scoring and pipeline management
          </p>
        </div>
        <Button>
          <Rocket className="mr-2 h-4 w-4" />
          New Deployment
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today</p>
                <p className="text-2xl font-bold">12</p>
              </div>
              <Rocket className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold text-green-500">94%</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Risk Score</p>
                <p className="text-2xl font-bold">38</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rollbacks</p>
                <p className="text-2xl font-bold text-orange-500">2</p>
              </div>
              <RotateCcw className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="pipeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
          <TabsTrigger value="environments">Environments</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-4">
          {/* Pipeline View */}
          <Card>
            <CardHeader>
              <CardTitle>Deployment Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {environments.map((env, index) => (
                  <div key={env.name} className="flex items-center">
                    <div className="text-center">
                      <div
                        className={cn(
                          'w-32 h-32 rounded-lg border-2 flex flex-col items-center justify-center',
                          env.status === 'healthy'
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                        )}
                      >
                        <Server className="h-8 w-8 mb-2 text-muted-foreground" />
                        <p className="font-medium">{env.name}</p>
                        <p className="text-sm text-muted-foreground">{env.version}</p>
                      </div>
                      <div className="mt-2 flex items-center justify-center gap-2">
                        <div
                          className={cn(
                            'h-2 w-2 rounded-full',
                            env.status === 'healthy' ? 'bg-green-500' : 'bg-yellow-500'
                          )}
                        />
                        <span className="text-sm capitalize">{env.status}</span>
                      </div>
                    </div>
                    {index < environments.length - 1 && (
                      <ArrowRight className="h-6 w-6 mx-4 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Deployments */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Deployments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {deployments.slice(0, 3).map((deployment) => {
                  const StatusIcon = statusIcons[deployment.status as keyof typeof statusIcons]
                  return (
                    <div
                      key={deployment.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            'p-2 rounded-lg',
                            getStatusColor(deployment.status)
                          )}
                        >
                          <StatusIcon
                            className={cn(
                              'h-5 w-5',
                              deployment.status === 'in_progress' && 'animate-spin'
                            )}
                          />
                        </div>
                        <div>
                          <h4 className="font-medium">
                            {deployment.repository} {deployment.version}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {deployment.environment} • {deployment.deployed_by}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Risk</p>
                          <p className={cn('font-bold', getRiskColor(deployment.risk_score))}>
                            {deployment.risk_score}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Started</p>
                          <p className="text-sm">{formatRelativeTime(deployment.started_at)}</p>
                        </div>
                        <Badge className={cn(getStatusColor(deployment.status))}>
                          {deployment.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Deployment History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {deployments.map((deployment) => {
                  const StatusIcon = statusIcons[deployment.status as keyof typeof statusIcons]
                  return (
                    <div
                      key={deployment.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            'p-2 rounded-lg',
                            getStatusColor(deployment.status)
                          )}
                        >
                          <StatusIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-medium">
                            {deployment.repository} {deployment.version}
                          </h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <GitBranch className="h-4 w-4" />
                            <span>{deployment.environment}</span>
                            <span>•</span>
                            <span>{deployment.deployed_by}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Risk Score</p>
                          <p className={cn('font-bold', getRiskColor(deployment.risk_score))}>
                            {deployment.risk_score}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Duration</p>
                          <p className="text-sm">
                            {deployment.duration_seconds
                              ? `${Math.floor(deployment.duration_seconds / 60)}m`
                              : '-'}
                          </p>
                        </div>
                        <Badge className={cn(getStatusColor(deployment.status))}>
                          {deployment.status.replace('_', ' ')}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Risk Gauge */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="relative inline-flex">
                    <div
                      className={cn(
                        'w-40 h-40 rounded-full border-8 flex items-center justify-center',
                        selectedRiskScore < 40
                          ? 'border-green-500'
                          : selectedRiskScore < 70
                          ? 'border-yellow-500'
                          : 'border-red-500'
                      )}
                    >
                      <div>
                        <p className={cn('text-4xl font-bold', getRiskColor(selectedRiskScore))}>
                          {selectedRiskScore}
                        </p>
                        <p className="text-sm text-muted-foreground">Risk Score</p>
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-lg font-medium">
                    {selectedRiskScore < 40
                      ? 'Low Risk - Safe to Deploy'
                      : selectedRiskScore < 70
                      ? 'Medium Risk - Review Recommended'
                      : 'High Risk - Caution Advised'}
                  </p>
                  <p className="text-sm text-muted-foreground">Confidence: High (92%)</p>
                </div>
              </CardContent>
            </Card>

            {/* Risk Factors */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Factors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {riskFactors.map((factor, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{factor.category}</span>
                        <Badge
                          variant={
                            factor.impact === 'high'
                              ? 'error'
                              : factor.impact === 'medium'
                              ? 'warning'
                              : 'secondary'
                          }
                        >
                          {factor.impact}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={factor.score} className="h-2 flex-1" />
                        <span className="text-sm text-muted-foreground w-8">
                          {factor.score}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{factor.factor}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Consider deploying during low-traffic hours</p>
                    <p className="text-sm text-muted-foreground">
                      Database migrations detected. Deploy during off-peak to minimize impact.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Activity className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Enable canary deployment</p>
                    <p className="text-sm text-muted-foreground">
                      Gradually roll out to 10% of traffic before full deployment.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="environments" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {environments.map((env) => (
              <Card key={env.name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{env.name}</CardTitle>
                    <Badge variant={env.status === 'healthy' ? 'success' : 'warning'}>
                      {env.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Version</span>
                      <span className="font-medium">{env.version}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Health</span>
                      <span className="font-medium text-green-500">{env.health}%</span>
                    </div>
                    <Progress value={env.health} className="h-2" />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        Deploy
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        Rollback
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
