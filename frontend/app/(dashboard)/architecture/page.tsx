'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  Network,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Settings,
  TrendingUp,
  Layers,
  GitBranch,
  RefreshCw,
  Trash2,
  Edit,
  Play,
  Scan,
} from 'lucide-react'
import * as d3 from 'd3'
import { repositories } from '@/lib/api/endpoints'
import {
  getDependencyGraph,
  analyzeDependencies,
  getArchitectureRules,
  getComplianceStatus,
  getDriftReport,
  validateArchitecture,
  createArchitectureRule,
  updateArchitectureRule,
  deleteArchitectureRule,
  type DependencyGraph,
  type ArchitectureRule,
  type ComplianceStatus,
  type DriftReport,
  type ValidateResponse,
  type DependencyNode,
  type DependencyEdge,
} from '@/lib/api/architecture'

interface Repository {
  id: string
  name: string
  provider: string
  organization_id: string
}

function DependencyGraphView({
  nodes,
  edges
}: {
  nodes: DependencyNode[]
  edges: DependencyEdge[]
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const simulationRef = useRef<d3.Simulation<d3.SimulationNodeDatum, undefined> | null>(null)

  useEffect(() => {
    // Cleanup previous simulation
    if (simulationRef.current) {
      simulationRef.current.stop()
      simulationRef.current = null
    }

    if (!svgRef.current || nodes.length === 0) return

    const svg = d3.select(svgRef.current)
    // Clear all existing content
    svg.selectAll('*').remove()

    const width = 600
    const height = 400

    svg.attr('width', width).attr('height', height)

    // Create copies of the data for d3 simulation
    const nodesCopy = nodes.map(n => ({ ...n, health: n.health_score || 80 }))
    const edgesCopy = edges.map(e => ({ ...e }))

    const simulation = d3
      .forceSimulation(nodesCopy as d3.SimulationNodeDatum[])
      .force(
        'link',
        d3
          .forceLink(edgesCopy)
          .id((d: any) => d.id)
          .distance(100)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))

    // Store simulation reference for cleanup
    simulationRef.current = simulation

    // Add arrow marker
    svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .append('path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', '#94a3b8')

    const link = svg
      .append('g')
      .selectAll('line')
      .data(edgesCopy)
      .enter()
      .append('line')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead)')

    const node = svg
      .append('g')
      .selectAll('g')
      .data(nodesCopy)
      .enter()
      .append('g')
      .call(
        d3
          .drag<SVGGElement, any>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          })
      )

    node
      .append('circle')
      .attr('r', 25)
      .attr('fill', (d: any) =>
        d.health >= 90 ? '#22c55e' : d.health >= 80 ? '#eab308' : '#ef4444'
      )
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)

    node
      .append('text')
      .text((d: any) => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', 40)
      .attr('fill', 'currentColor')
      .attr('font-size', '12px')

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
    })

    return () => {
      simulation.stop()
      if (svgRef.current) {
        d3.select(svgRef.current).selectAll('*').remove()
      }
    }
  }, [nodes, edges])

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
        <Network className="h-12 w-12 mb-4 opacity-50" />
        <p>No dependency data available</p>
        <p className="text-sm">Click "Analyze" to scan repository structure from GitHub</p>
      </div>
    )
  }

  return <svg ref={svgRef} className="w-full" />
}

export default function ArchitecturePage() {
  const [repos, setRepos] = useState<Repository[]>([])
  const [selectedRepoId, setSelectedRepoId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)

  // Data states
  const [dependencyGraph, setDependencyGraph] = useState<DependencyGraph | null>(null)
  const [rules, setRules] = useState<ArchitectureRule[]>([])
  const [compliance, setCompliance] = useState<ComplianceStatus | null>(null)
  const [drift, setDrift] = useState<DriftReport | null>(null)
  const [validationResult, setValidationResult] = useState<ValidateResponse | null>(null)

  // Dialog states
  const [showRuleDialog, setShowRuleDialog] = useState(false)
  const [editingRule, setEditingRule] = useState<ArchitectureRule | null>(null)
  const [ruleForm, setRuleForm] = useState({
    name: '',
    description: '',
    rule_type: 'dependency',
    severity: 'warning',
    enabled: true,
  })

  // Fetch repositories
  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const response = await repositories.list()
        setRepos(response.data.items || [])
        if (response.data.items?.length > 0) {
          setSelectedRepoId(response.data.items[0].id)
        }
      } catch (error) {
        console.error('Failed to fetch repositories:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchRepos()
  }, [])

  // Fetch architecture rules
  const fetchRules = useCallback(async () => {
    try {
      const response = await getArchitectureRules()
      setRules(response.items || [])
    } catch (error) {
      console.error('Failed to fetch rules:', error)
    }
  }, [])

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  // Fetch data when repository changes
  const fetchRepoData = useCallback(async () => {
    if (!selectedRepoId) return

    try {
      const [graphRes, complianceRes, driftRes] = await Promise.all([
        getDependencyGraph(selectedRepoId),
        getComplianceStatus(selectedRepoId),
        getDriftReport(selectedRepoId),
      ])

      setDependencyGraph(graphRes)
      setCompliance(complianceRes)
      setDrift(driftRes)
    } catch (error) {
      console.error('Failed to fetch architecture data:', error)
    }
  }, [selectedRepoId])

  useEffect(() => {
    if (selectedRepoId) {
      fetchRepoData()
    }
  }, [selectedRepoId, fetchRepoData])

  // Validate architecture
  const handleValidate = async () => {
    if (!selectedRepoId) return

    setValidating(true)
    try {
      const result = await validateArchitecture({ repository_id: selectedRepoId })
      setValidationResult(result)
    } catch (error) {
      console.error('Failed to validate architecture:', error)
    } finally {
      setValidating(false)
    }
  }

  // Analyze dependencies from GitHub
  const handleAnalyze = async () => {
    if (!selectedRepoId || analyzing) return

    setAnalyzing(true)
    // Clear existing graph before fetching new one
    setDependencyGraph(null)
    try {
      const graph = await analyzeDependencies(selectedRepoId)
      setDependencyGraph(graph)
      // Refresh compliance and drift after analysis
      const [complianceRes, driftRes] = await Promise.all([
        getComplianceStatus(selectedRepoId),
        getDriftReport(selectedRepoId),
      ])
      setCompliance(complianceRes)
      setDrift(driftRes)
    } catch (error) {
      console.error('Failed to analyze dependencies:', error)
    } finally {
      setAnalyzing(false)
    }
  }

  // Create or update rule
  const handleSaveRule = async () => {
    try {
      const selectedRepo = repos.find(r => r.id === selectedRepoId)
      if (!selectedRepo) return

      if (editingRule) {
        await updateArchitectureRule(editingRule.id, {
          name: ruleForm.name,
          description: ruleForm.description,
          severity: ruleForm.severity,
          enabled: ruleForm.enabled,
        })
      } else {
        await createArchitectureRule({
          organization_id: selectedRepo.organization_id,
          name: ruleForm.name,
          description: ruleForm.description,
          rule_type: ruleForm.rule_type,
          severity: ruleForm.severity,
          rule_definition: { type: ruleForm.rule_type },
          enabled: ruleForm.enabled,
        })
      }

      setShowRuleDialog(false)
      setEditingRule(null)
      setRuleForm({
        name: '',
        description: '',
        rule_type: 'dependency',
        severity: 'warning',
        enabled: true,
      })
      fetchRules()
    } catch (error) {
      console.error('Failed to save rule:', error)
    }
  }

  // Delete rule
  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return

    try {
      await deleteArchitectureRule(ruleId)
      fetchRules()
    } catch (error) {
      console.error('Failed to delete rule:', error)
    }
  }

  // Edit rule
  const handleEditRule = (rule: ArchitectureRule) => {
    setEditingRule(rule)
    setRuleForm({
      name: rule.name,
      description: rule.description || '',
      rule_type: rule.rule_type,
      severity: rule.severity,
      enabled: rule.enabled,
    })
    setShowRuleDialog(true)
  }

  // Toggle rule enabled
  const handleToggleRule = async (rule: ArchitectureRule) => {
    try {
      await updateArchitectureRule(rule.id, { enabled: !rule.enabled })
      fetchRules()
    } catch (error) {
      console.error('Failed to toggle rule:', error)
    }
  }

  // Compute stats
  const activeRulesCount = rules.filter(r => r.enabled).length
  const totalViolations = validationResult?.failed_rules || 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Architecture</h1>
          <p className="text-muted-foreground">
            Dependency governance and architectural compliance
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedRepoId} onValueChange={setSelectedRepoId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select repository" />
            </SelectTrigger>
            <SelectContent>
              {repos.map((repo) => (
                <SelectItem key={repo.id} value={repo.id}>
                  {repo.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={handleAnalyze}
            disabled={!selectedRepoId || analyzing}
          >
            {analyzing ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Scan className="mr-2 h-4 w-4" />
            )}
            Analyze
          </Button>
          <Button
            variant="outline"
            onClick={handleValidate}
            disabled={!selectedRepoId || validating}
          >
            {validating ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Validate
          </Button>
          <Button onClick={() => setShowRuleDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Rule
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Compliance</p>
                <p className={cn(
                  "text-2xl font-bold",
                  compliance?.overall_score && compliance.overall_score >= 80 ? "text-green-500" :
                  compliance?.overall_score && compliance.overall_score >= 60 ? "text-yellow-500" : "text-red-500"
                )}>
                  {compliance?.overall_score ? `${compliance.overall_score.toFixed(1)}%` : 'N/A'}
                </p>
              </div>
              <CheckCircle2 className={cn(
                "h-8 w-8",
                compliance?.overall_score && compliance.overall_score >= 80 ? "text-green-500" : "text-yellow-500"
              )} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Rules</p>
                <p className="text-2xl font-bold">{activeRulesCount}</p>
              </div>
              <Settings className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Violations</p>
                <p className={cn(
                  "text-2xl font-bold",
                  totalViolations > 0 ? "text-orange-500" : "text-green-500"
                )}>
                  {validationResult ? totalViolations : (compliance?.rules_violated || 0)}
                </p>
              </div>
              <AlertTriangle className={cn(
                "h-8 w-8",
                totalViolations > 0 ? "text-orange-500" : "text-green-500"
              )} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Drift Score</p>
                <p className={cn(
                  "text-2xl font-bold",
                  drift?.drift_score && drift.drift_score < 20 ? "text-green-500" :
                  drift?.drift_score && drift.drift_score < 50 ? "text-yellow-500" : "text-red-500"
                )}>
                  {drift?.drift_score ? `${drift.drift_score.toFixed(1)}%` : 'N/A'}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="graph" className="space-y-4">
        <TabsList>
          <TabsTrigger value="graph">Dependency Graph</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="violations">Violations</TabsTrigger>
          <TabsTrigger value="drift">Drift Report</TabsTrigger>
        </TabsList>

        <TabsContent value="graph" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Module Dependencies
                {selectedRepoId && (
                  <Badge variant="outline" className="ml-2">
                    {repos.find(r => r.id === selectedRepoId)?.name}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <DependencyGraphView
                  key={`${selectedRepoId}-${dependencyGraph?.nodes?.length || 0}`}
                  nodes={dependencyGraph?.nodes || []}
                  edges={dependencyGraph?.edges || []}
                />
              </div>
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500" />
                  <span className="text-sm">Healthy (90%+)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-yellow-500" />
                  <span className="text-sm">Warning (80-90%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-500" />
                  <span className="text-sm">Critical (&lt;80%)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Layers */}
          {dependencyGraph?.layers && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Architecture Layers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(dependencyGraph.layers).map(([layer, modules]) => (
                    <div
                      key={layer}
                      className={cn(
                        "p-4 rounded-lg",
                        layer === 'presentation' && "bg-blue-50 dark:bg-blue-900/20",
                        layer === 'business' && "bg-green-50 dark:bg-green-900/20",
                        layer === 'data' && "bg-purple-50 dark:bg-purple-900/20",
                        layer === 'infrastructure' && "bg-gray-50 dark:bg-gray-900/20"
                      )}
                    >
                      <h4 className="font-medium capitalize">{layer} Layer</h4>
                      <p className="text-sm text-muted-foreground">{modules.join(', ')}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Architecture Rules</CardTitle>
            </CardHeader>
            <CardContent>
              {rules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No architecture rules defined yet.</p>
                  <p className="text-sm">Click "Add Rule" to create your first rule.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            'p-2 rounded-lg cursor-pointer',
                            rule.enabled
                              ? 'bg-green-100 dark:bg-green-900/30'
                              : 'bg-gray-100 dark:bg-gray-800'
                          )}
                          onClick={() => handleToggleRule(rule)}
                        >
                          {rule.enabled ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <Settings className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium">{rule.name}</h4>
                          {rule.description && (
                            <p className="text-sm text-muted-foreground">{rule.description}</p>
                          )}
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline">{rule.rule_type}</Badge>
                            <Badge
                              variant={rule.severity === 'error' ? 'destructive' : 'secondary'}
                            >
                              {rule.severity}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditRule(rule)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteRule(rule.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="violations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Violations</CardTitle>
            </CardHeader>
            <CardContent>
              {!validationResult ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No validation results yet.</p>
                  <p className="text-sm">Click "Validate" to check for violations.</p>
                </div>
              ) : validationResult.passed ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="text-green-600 font-medium">All rules passed!</p>
                  <p className="text-sm text-muted-foreground">
                    {validationResult.passed_rules} of {validationResult.total_rules} rules compliant
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {validationResult.results
                    .filter(r => !r.passed)
                    .map((result) => (
                      <div key={result.rule_id}>
                        <h4 className="font-medium text-red-600 mb-2">{result.rule_name}</h4>
                        {result.violations.map((v) => (
                          <div
                            key={v.id}
                            className="p-4 border border-red-200 bg-red-50 dark:bg-red-900/20 rounded-lg mb-2"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {v.source_module} → {v.target_module}
                                </p>
                                {v.file_path && (
                                  <p className="text-sm text-muted-foreground">
                                    {v.file_path}:{v.line_number}
                                  </p>
                                )}
                              </div>
                              <Badge variant="destructive">{v.violation_type}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drift" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Drift Report
                {selectedRepoId && (
                  <Badge variant="outline" className="ml-2">
                    {repos.find(r => r.id === selectedRepoId)?.name}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!drift ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a repository to view drift report.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Drift Score Display */}
                  <div className="text-center py-6 bg-muted/50 rounded-lg">
                    <p className={cn(
                      "text-5xl font-bold",
                      drift.drift_score < 20 ? "text-green-500" :
                      drift.drift_score < 40 ? "text-yellow-500" :
                      drift.drift_score < 60 ? "text-orange-500" : "text-red-500"
                    )}>
                      {drift.drift_score.toFixed(1)}%
                    </p>
                    <p className="text-muted-foreground mt-1">Architecture Drift Score</p>
                    <p className={cn(
                      "text-sm mt-2 font-medium",
                      drift.drift_score < 20 ? "text-green-600" :
                      drift.drift_score < 40 ? "text-yellow-600" :
                      drift.drift_score < 60 ? "text-orange-600" : "text-red-600"
                    )}>
                      {drift.drift_score < 20 ? "Healthy" :
                       drift.drift_score < 40 ? "Moderate" :
                       drift.drift_score < 60 ? "Needs Attention" : "Critical"}
                    </p>
                  </div>

                  {/* Architecture Issues */}
                  {drift.changes.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-medium flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Architecture Issues
                      </h4>
                      <div className="space-y-2">
                        {drift.changes.map((change, i) => (
                          <div
                            key={i}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg border",
                              change.type === 'critical' && "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
                              change.type === 'warning' && "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
                              change.type === 'info' && "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
                              !['critical', 'warning', 'info'].includes(change.type) && "bg-muted"
                            )}
                          >
                            <AlertTriangle className={cn(
                              "h-5 w-5 flex-shrink-0",
                              change.type === 'critical' && "text-red-500",
                              change.type === 'warning' && "text-yellow-500",
                              change.type === 'info' && "text-blue-500",
                              !['critical', 'warning', 'info'].includes(change.type) && "text-gray-500"
                            )} />
                            <span className="text-sm">{change.details}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(drift.new_dependencies.length > 0 || drift.removed_dependencies.length > 0) && (
                    <div className="space-y-4">
                      <h4 className="font-medium">Dependency Changes</h4>
                      {drift.new_dependencies.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">New Dependencies:</p>
                          <div className="flex flex-wrap gap-2">
                            {drift.new_dependencies.map((dep) => (
                              <Badge key={dep} variant="outline" className="text-green-600">
                                + {dep}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {drift.removed_dependencies.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Removed Dependencies:</p>
                          <div className="flex flex-wrap gap-2">
                            {drift.removed_dependencies.map((dep) => (
                              <Badge key={dep} variant="outline" className="text-red-600">
                                - {dep}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {drift.recommendations.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-medium">Recommendations</h4>
                      <div className="space-y-2">
                        {drift.recommendations.map((rec, i) => (
                          <div key={i} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
                            {rec}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Rule Dialog */}
      <Dialog open={showRuleDialog} onOpenChange={(open) => {
        setShowRuleDialog(open)
        if (!open) {
          setEditingRule(null)
          setRuleForm({
            name: '',
            description: '',
            rule_type: 'dependency',
            severity: 'warning',
            enabled: true,
          })
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Rule' : 'Add Architecture Rule'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Rule Name</label>
              <Input
                value={ruleForm.name}
                onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                placeholder="e.g., No circular dependencies"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={ruleForm.description}
                onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            {!editingRule && (
              <div>
                <label className="text-sm font-medium">Rule Type</label>
                <Select
                  value={ruleForm.rule_type}
                  onValueChange={(v) => setRuleForm({ ...ruleForm, rule_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dependency">Dependency</SelectItem>
                    <SelectItem value="naming">Naming</SelectItem>
                    <SelectItem value="structure">Structure</SelectItem>
                    <SelectItem value="import">Import</SelectItem>
                    <SelectItem value="layer">Layer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Severity</label>
              <Select
                value={ruleForm.severity}
                onValueChange={(v) => setRuleForm({ ...ruleForm, severity: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRuleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRule} disabled={!ruleForm.name}>
              {editingRule ? 'Update' : 'Create'} Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
