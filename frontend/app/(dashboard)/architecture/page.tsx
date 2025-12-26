'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
} from 'lucide-react'
import * as d3 from 'd3'

// Demo dependency graph data
const graphData = {
  nodes: [
    { id: 'api', name: 'API Layer', type: 'module', health: 92 },
    { id: 'services', name: 'Services', type: 'module', health: 88 },
    { id: 'models', name: 'Models', type: 'module', health: 95 },
    { id: 'utils', name: 'Utilities', type: 'module', health: 90 },
    { id: 'auth', name: 'Auth', type: 'module', health: 85 },
    { id: 'db', name: 'Database', type: 'module', health: 91 },
    { id: 'external', name: 'External APIs', type: 'service', health: 78 },
  ],
  edges: [
    { source: 'api', target: 'services' },
    { source: 'api', target: 'auth' },
    { source: 'services', target: 'models' },
    { source: 'services', target: 'db' },
    { source: 'services', target: 'utils' },
    { source: 'services', target: 'external' },
    { source: 'auth', target: 'models' },
    { source: 'auth', target: 'db' },
    { source: 'db', target: 'models' },
  ],
}

const rules = [
  {
    id: '1',
    name: 'No circular dependencies',
    type: 'dependency',
    severity: 'error',
    enabled: true,
    violations: 0,
  },
  {
    id: '2',
    name: 'Service layer isolation',
    type: 'layer',
    severity: 'error',
    enabled: true,
    violations: 2,
  },
  {
    id: '3',
    name: 'API naming convention',
    type: 'naming',
    severity: 'warning',
    enabled: true,
    violations: 5,
  },
  {
    id: '4',
    name: 'No direct database access from API',
    type: 'dependency',
    severity: 'error',
    enabled: true,
    violations: 0,
  },
  {
    id: '5',
    name: 'External API abstraction',
    type: 'structure',
    severity: 'warning',
    enabled: false,
    violations: 0,
  },
]

const violations = [
  {
    id: '1',
    rule: 'Service layer isolation',
    source: 'api.endpoints',
    target: 'db.connection',
    file: 'src/api/endpoints.py',
    line: 45,
  },
  {
    id: '2',
    rule: 'Service layer isolation',
    source: 'api.routes',
    target: 'models.user',
    file: 'src/api/routes.py',
    line: 78,
  },
]

function DependencyGraph() {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = 600
    const height = 400

    svg.attr('width', width).attr('height', height)

    const simulation = d3
      .forceSimulation(graphData.nodes as d3.SimulationNodeDatum[])
      .force(
        'link',
        d3
          .forceLink(graphData.edges)
          .id((d: any) => d.id)
          .distance(100)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))

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
      .data(graphData.edges)
      .enter()
      .append('line')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead)')

    const node = svg
      .append('g')
      .selectAll('g')
      .data(graphData.nodes)
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
  }, [])

  return <svg ref={svgRef} className="w-full" />
}

export default function ArchitecturePage() {
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
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Rule
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Compliance</p>
                <p className="text-2xl font-bold text-green-500">85%</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Rules</p>
                <p className="text-2xl font-bold">{rules.filter((r) => r.enabled).length}</p>
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
                <p className="text-2xl font-bold text-orange-500">7</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Drift Score</p>
                <p className="text-2xl font-bold">15%</p>
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
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <DependencyGraph />
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Architecture Layers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-medium">Presentation Layer</h4>
                  <p className="text-sm text-muted-foreground">api</p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <h4 className="font-medium">Business Layer</h4>
                  <p className="text-sm text-muted-foreground">services, auth</p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <h4 className="font-medium">Data Layer</h4>
                  <p className="text-sm text-muted-foreground">models, db</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                  <h4 className="font-medium">Infrastructure</h4>
                  <p className="text-sm text-muted-foreground">utils, external</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Architecture Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          'p-2 rounded-lg',
                          rule.enabled
                            ? 'bg-green-100 dark:bg-green-900/30'
                            : 'bg-gray-100 dark:bg-gray-800'
                        )}
                      >
                        {rule.enabled ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Settings className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium">{rule.name}</h4>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline">{rule.type}</Badge>
                          <Badge
                            variant={rule.severity === 'error' ? 'error' : 'warning'}
                          >
                            {rule.severity}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {rule.violations > 0 && (
                        <Badge variant="error">{rule.violations} violations</Badge>
                      )}
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="violations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Violations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {violations.map((v) => (
                  <div key={v.id} className="p-4 border border-red-200 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-red-700 dark:text-red-400">
                          {v.rule}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {v.source} → {v.target}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {v.file}:{v.line}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        View Code
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drift" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Drift Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="text-center py-8">
                  <p className="text-4xl font-bold text-yellow-500">15.5%</p>
                  <p className="text-muted-foreground">Drift Score (last 30 days)</p>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium">Recent Changes</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <GitBranch className="h-5 w-5 text-blue-500" />
                      <span>Added analytics service module</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <GitBranch className="h-5 w-5 text-green-500" />
                      <span>15 new API endpoints added</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <GitBranch className="h-5 w-5 text-orange-500" />
                      <span>3 new dependencies: pandas, numpy, scipy</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
