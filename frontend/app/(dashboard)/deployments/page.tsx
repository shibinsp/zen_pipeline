'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Loader2,
  RefreshCw,
  Plus,
} from 'lucide-react'
import { getRepositories } from '@/lib/api/code-analysis'
import {
  getDeployments,
  createDeployment,
  completeDeployment,
  calculateRiskScore,
  compareEnvironments,
  type Deployment,
  type RiskScoreResponse,
  type EnvironmentComparison,
} from '@/lib/api/deployments'
import type { Repository } from '@/types'

const statusIcons = {
  completed: CheckCircle2,
  in_progress: RotateCcw,
  failed: XCircle,
  rolled_back: RotateCcw,
  pending: Clock,
}

export default function DeploymentsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [environments, setEnvironments] = useState<EnvironmentComparison[]>([])
  const [riskAssessment, setRiskAssessment] = useState<RiskScoreResponse | null>(null)

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedRepoId, setSelectedRepoId] = useState('')
  const [selectedEnvironment, setSelectedEnvironment] = useState('')
  const [version, setVersion] = useState('')
  const [commitSha, setCommitSha] = useState('')
  const [strategy, setStrategy] = useState('rolling')
  const [notes, setNotes] = useState('')
  const [isDeploying, setIsDeploying] = useState(false)
  const [deployError, setDeployError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [deploymentsRes, reposRes] = await Promise.all([
        getDeployments(),
        getRepositories(),
      ])

      setDeployments(deploymentsRes.items)
      setRepositories(reposRes.items)

      // Get environment comparison for first repo if available
      if (reposRes.items.length > 0) {
        try {
          const envs = await compareEnvironments(reposRes.items[0].id)
          setEnvironments(envs)
        } catch {
          // Set default environments if API fails
          setEnvironments([
            { environment: 'development', current_version: 'N/A', status: 'unknown', health_score: 0 },
            { environment: 'staging', current_version: 'N/A', status: 'unknown', health_score: 0 },
            { environment: 'production', current_version: 'N/A', status: 'unknown', health_score: 0 },
          ])
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Calculate stats from real data
  const stats = useMemo(() => {
    const today = new Date().toDateString()
    const todayDeployments = deployments.filter(
      d => new Date(d.created_at).toDateString() === today
    )

    const completed = deployments.filter(d => d.status === 'completed')
    const failed = deployments.filter(d => d.status === 'failed')
    const rolledBack = deployments.filter(d => d.status === 'rolled_back')

    const successRate = deployments.length > 0
      ? ((completed.length / deployments.length) * 100).toFixed(0)
      : '0'

    const avgRiskScore = deployments.length > 0
      ? Math.round(deployments.reduce((sum, d) => sum + d.risk_score, 0) / deployments.length)
      : 0

    return {
      todayCount: todayDeployments.length,
      successRate,
      avgRiskScore,
      rollbackCount: rolledBack.length,
    }
  }, [deployments])

  const handleDeploy = async () => {
    if (!selectedRepoId || !selectedEnvironment || !version || !commitSha) {
      setDeployError('Please fill in all required fields')
      return
    }

    setIsDeploying(true)
    setDeployError(null)

    try {
      // Calculate risk score first
      const riskScore = await calculateRiskScore({
        repository_id: selectedRepoId,
        commit_sha: commitSha,
        environment: selectedEnvironment,
      })
      setRiskAssessment(riskScore)

      // Create deployment (starts as in_progress)
      const deployment = await createDeployment({
        repository_id: selectedRepoId,
        environment: selectedEnvironment,
        version,
        commit_sha: commitSha,
        strategy,
        notes: notes || undefined,
      })

      // Close dialog and refresh to show in_progress deployment
      setIsDialogOpen(false)
      resetForm()
      await fetchData()

      // Simulate deployment progress - wait 3-5 seconds then complete
      const simulationDelay = 3000 + Math.random() * 2000
      setTimeout(async () => {
        try {
          await completeDeployment(deployment.id)
          await fetchData()  // Refresh to show final status
        } catch (err) {
          console.error('Failed to complete deployment:', err)
        }
      }, simulationDelay)

    } catch (error) {
      setDeployError(error instanceof Error ? error.message : 'Failed to create deployment')
    } finally {
      setIsDeploying(false)
    }
  }

  const resetForm = () => {
    setSelectedRepoId('')
    setSelectedEnvironment('')
    setVersion('')
    setCommitSha('')
    setStrategy('rolling')
    setNotes('')
    setDeployError(null)
  }

  const handleRepoChange = async (repoId: string) => {
    setSelectedRepoId(repoId)
    // Get environments for selected repo
    if (repoId) {
      try {
        const envs = await compareEnvironments(repoId)
        setEnvironments(envs)
      } catch {
        // Ignore
      }
    }
  }

  const getRepoName = (repoId: string) => {
    const repo = repositories.find(r => r.id === repoId)
    return repo?.name || 'Unknown'
  }

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
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Rocket className="mr-2 h-4 w-4" />
            New Deployment
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today</p>
                <p className="text-2xl font-bold">{stats.todayCount}</p>
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
                <p className="text-2xl font-bold text-green-500">{stats.successRate}%</p>
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
                <p className="text-2xl font-bold">{stats.avgRiskScore}</p>
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
                <p className="text-2xl font-bold text-orange-500">{stats.rollbackCount}</p>
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
              {environments.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  No environment data available
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  {environments.map((env, index) => (
                    <div key={env.environment} className="flex items-center">
                      <div className="text-center">
                        <div
                          className={cn(
                            'w-32 h-32 rounded-lg border-2 flex flex-col items-center justify-center',
                            env.status === 'healthy'
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                              : env.status === 'deploying'
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : env.status === 'warning'
                              ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                              : env.status === 'degraded'
                              ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                              : 'border-gray-300 bg-gray-50 dark:bg-gray-900/20'
                          )}
                        >
                          {env.status === 'deploying' ? (
                            <Loader2 className="h-8 w-8 mb-2 text-blue-500 animate-spin" />
                          ) : (
                            <Server className="h-8 w-8 mb-2 text-muted-foreground" />
                          )}
                          <p className="font-medium capitalize">{env.environment}</p>
                          <p className="text-sm text-muted-foreground">{env.current_version}</p>
                        </div>
                        <div className="mt-2 flex items-center justify-center gap-2">
                          <div
                            className={cn(
                              'h-2 w-2 rounded-full',
                              env.status === 'healthy' ? 'bg-green-500' :
                              env.status === 'deploying' ? 'bg-blue-500 animate-pulse' :
                              env.status === 'warning' ? 'bg-yellow-500' :
                              env.status === 'degraded' ? 'bg-red-500' :
                              'bg-gray-400'
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
              )}
            </CardContent>
          </Card>

          {/* Recent Deployments */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Deployments</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : deployments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Rocket className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No deployments yet</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Create your first deployment to get started
                  </p>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Deployment
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {deployments.slice(0, 5).map((deployment) => {
                    const StatusIcon = statusIcons[deployment.status as keyof typeof statusIcons] || Clock
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
                              {getRepoName(deployment.repository_id)} {deployment.version}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {deployment.environment} • {deployment.branch || 'main'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Risk</p>
                            <p className={cn('font-bold', getRiskColor(deployment.risk_score))}>
                              {Math.round(deployment.risk_score)}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Started</p>
                            <p className="text-sm">
                              {deployment.started_at ? formatRelativeTime(deployment.started_at) : '-'}
                            </p>
                          </div>
                          <Badge className={cn(getStatusColor(deployment.status))}>
                            {deployment.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Deployment History</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : deployments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Rocket className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No deployment history</h3>
                  <p className="text-muted-foreground text-center">
                    Deployments will appear here once created
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {deployments.map((deployment) => {
                    const StatusIcon = statusIcons[deployment.status as keyof typeof statusIcons] || Clock
                    return (
                      <div
                        key={deployment.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
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
                              {getRepoName(deployment.repository_id)} {deployment.version}
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <GitBranch className="h-4 w-4" />
                              <span>{deployment.environment}</span>
                              <span>•</span>
                              <span>{deployment.branch || 'main'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <p className="text-sm text-muted-foreground">Risk Score</p>
                            <p className={cn('font-bold', getRiskColor(deployment.risk_score))}>
                              {Math.round(deployment.risk_score)}
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
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
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
                {!riskAssessment ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No risk assessment</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Create a deployment to see risk analysis
                    </p>
                    <Button onClick={() => setIsDialogOpen(true)}>
                      <Rocket className="mr-2 h-4 w-4" />
                      New Deployment
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="relative inline-flex">
                      <div
                        className={cn(
                          'w-40 h-40 rounded-full border-8 flex items-center justify-center',
                          riskAssessment.risk_score < 40
                            ? 'border-green-500'
                            : riskAssessment.risk_score < 70
                            ? 'border-yellow-500'
                            : 'border-red-500'
                        )}
                      >
                        <div>
                          <p className={cn('text-4xl font-bold', getRiskColor(riskAssessment.risk_score))}>
                            {Math.round(riskAssessment.risk_score)}
                          </p>
                          <p className="text-sm text-muted-foreground">Risk Score</p>
                        </div>
                      </div>
                    </div>
                    <p className="mt-4 text-lg font-medium capitalize">
                      {riskAssessment.risk_level} Risk
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Confidence: {riskAssessment.confidence_level} ({Math.round((riskAssessment.historical_success_rate || 0) * 100)}%)
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Risk Factors */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Factors</CardTitle>
              </CardHeader>
              <CardContent>
                {!riskAssessment ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    Run a deployment to see risk factors
                  </div>
                ) : (
                  <div className="space-y-4">
                    {riskAssessment.risk_factors.map((factor, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{factor.factor}</span>
                          <Badge variant="secondary">
                            {Math.round(factor.weight * 100)}%
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={factor.score} className="h-2 flex-1" />
                          <span className="text-sm text-muted-foreground w-8">
                            {Math.round(factor.score)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{factor.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          {riskAssessment && riskAssessment.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {riskAssessment.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                      <p className="font-medium">{rec}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="environments" className="space-y-4">
          {environments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Server className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No environment data</h3>
                <p className="text-muted-foreground text-center">
                  Deploy to environments to see them here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {environments.map((env) => (
                <Card key={env.environment}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="capitalize">{env.environment}</CardTitle>
                      <Badge
                        variant={
                          env.status === 'healthy' ? 'success' :
                          env.status === 'deploying' ? 'default' :
                          env.status === 'degraded' ? 'destructive' :
                          env.status === 'warning' ? 'warning' :
                          'secondary'
                        }
                        className={env.status === 'deploying' ? 'bg-blue-500' : ''}
                      >
                        {env.status === 'deploying' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                        {env.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Version</span>
                        <span className="font-medium">{env.current_version}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Health</span>
                        <span className={cn(
                          'font-medium',
                          env.health_score >= 90 ? 'text-green-500' :
                          env.health_score >= 70 ? 'text-yellow-500' : 'text-red-500'
                        )}>
                          {env.health_score > 0 ? `${Math.round(env.health_score)}%` : 'N/A'}
                        </span>
                      </div>
                      {env.health_score > 0 && (
                        <Progress value={env.health_score} className="h-2" />
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Last Deploy</span>
                        <span className="text-sm">
                          {env.last_deployment ? formatRelativeTime(env.last_deployment) : 'Never'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setSelectedEnvironment(env.environment)
                            setIsDialogOpen(true)
                          }}
                        >
                          Deploy
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* New Deployment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open)
        if (!open) resetForm()
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Deployment</DialogTitle>
            <DialogDescription>
              Create a new deployment with risk assessment
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Repository *</Label>
              <Select value={selectedRepoId} onValueChange={handleRepoChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select repository..." />
                </SelectTrigger>
                <SelectContent>
                  {repositories.length === 0 ? (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      No repositories found
                    </div>
                  ) : (
                    repositories.map((repo) => (
                      <SelectItem key={repo.id} value={repo.id}>
                        {repo.full_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Environment *</Label>
              <Select value={selectedEnvironment} onValueChange={setSelectedEnvironment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select environment..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="development">Development</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Version *</Label>
              <Input
                placeholder="e.g., v1.2.3"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Semantic version tag for this release
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Commit SHA *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setCommitSha(Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10))}
                >
                  Generate for Demo
                </Button>
              </div>
              <Input
                placeholder="e.g., a1b2c3d4e5f6"
                value={commitSha}
                onChange={(e) => setCommitSha(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Git commit hash identifying the exact code version (find with: git rev-parse HEAD)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Strategy</Label>
              <Select value={strategy} onValueChange={setStrategy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rolling">Rolling</SelectItem>
                  <SelectItem value="canary">Canary</SelectItem>
                  <SelectItem value="blue_green">Blue/Green</SelectItem>
                  <SelectItem value="recreate">Recreate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                placeholder="Deployment notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {deployError && (
              <p className="text-sm text-red-500">{deployError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isDeploying}>
              Cancel
            </Button>
            <Button onClick={handleDeploy} disabled={isDeploying}>
              {isDeploying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Rocket className="mr-2 h-4 w-4" />
                  Deploy
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
