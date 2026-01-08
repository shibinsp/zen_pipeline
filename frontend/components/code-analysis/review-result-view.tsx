'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { GitHubReviewResult, CodeIssue } from '@/types'
import {
  Github,
  Shield,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Code,
  FileCode,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Zap,
  Bug,
  Lock,
  FileWarning,
  Lightbulb,
  Flame,
  TestTube,
  BookOpen,
  GitBranch,
  Layers,
  Activity,
  TrendingUp,
  Package,
  Wrench,
  ArrowLeft,
} from 'lucide-react'

interface ReviewResultViewProps {
  result: GitHubReviewResult
  onBack: () => void
}

const severityConfig = {
  critical: { color: 'bg-red-500/20 text-red-500 border-red-500/50', icon: AlertTriangle, label: 'Critical' },
  high: { color: 'bg-orange-500/20 text-orange-500 border-orange-500/50', icon: AlertCircle, label: 'High' },
  medium: { color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50', icon: AlertCircle, label: 'Medium' },
  low: { color: 'bg-blue-500/20 text-blue-500 border-blue-500/50', icon: Info, label: 'Low' },
  info: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/50', icon: Info, label: 'Info' },
}

const categoryConfig: Record<string, { color: string; icon: any; label: string }> = {
  security: { color: 'bg-red-500/20 text-red-400', icon: Lock, label: 'Security' },
  code_quality: { color: 'bg-blue-500/20 text-blue-400', icon: Code, label: 'Code Quality' },
  performance: { color: 'bg-purple-500/20 text-purple-400', icon: Zap, label: 'Performance' },
  best_practices: { color: 'bg-green-500/20 text-green-400', icon: CheckCircle2, label: 'Best Practices' },
  maintainability: { color: 'bg-cyan-500/20 text-cyan-400', icon: FileCode, label: 'Maintainability' },
  bug_risk: { color: 'bg-orange-500/20 text-orange-400', icon: Bug, label: 'Bug Risk' },
  dependency: { color: 'bg-yellow-500/20 text-yellow-400', icon: FileWarning, label: 'Dependency' },
  documentation: { color: 'bg-indigo-500/20 text-indigo-400', icon: BookOpen, label: 'Documentation' },
  complexity: { color: 'bg-pink-500/20 text-pink-400', icon: Activity, label: 'Complexity' },
  dead_code: { color: 'bg-gray-500/20 text-gray-400', icon: FileWarning, label: 'Dead Code' },
}

const techCategoryIcons: Record<string, any> = {
  framework: Layers,
  library: Package,
  tool: Wrench,
  language: Code,
}

export function ReviewResultView({ result, onBack }: ReviewResultViewProps) {
  const [expandedIssues, setExpandedIssues] = useState<Set<number>>(new Set())
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  const toggleIssue = (index: number) => {
    const newExpanded = new Set(expandedIssues)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedIssues(newExpanded)
  }

  const filteredIssues = result.issues.filter(issue => {
    if (selectedSeverity && issue.severity !== selectedSeverity) return false
    if (selectedCategory && issue.category !== selectedCategory) return false
    return true
  })

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-yellow-500'
    if (score >= 40) return 'text-orange-500'
    return 'text-red-500'
  }

  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'from-green-500 to-emerald-500'
    if (score >= 60) return 'from-yellow-500 to-amber-500'
    if (score >= 40) return 'from-orange-500 to-red-500'
    return 'from-red-500 to-rose-600'
  }

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Repositories
        </Button>
      </div>

      {/* Repository Info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Github className="h-6 w-6" />
                {result.repository_name}
              </CardTitle>
              <CardDescription className="flex items-center gap-4 mt-2">
                <a
                  href={result.repository_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  View on GitHub <ExternalLink className="h-3 w-3" />
                </a>
                <span className="flex items-center gap-1">
                  <GitBranch className="h-3 w-3" />
                  {result.branch}
                </span>
              </CardDescription>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              Analyzed: {new Date(result.analyzed_at).toLocaleString()}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="issues">Issues ({result.issues.length})</TabsTrigger>
          <TabsTrigger value="files">Files ({result.total_files})</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="tech">Tech Stack</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Score Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Security Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center">
                  <div className={cn('text-4xl font-bold', getScoreColor(result.metrics.security_score))}>
                    {result.metrics.security_score}
                  </div>
                  <div className="w-full mt-2">
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn('h-full rounded-full bg-gradient-to-r', getScoreGradient(result.metrics.security_score))}
                        style={{ width: `${result.metrics.security_score}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Quality Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center">
                  <div className={cn('text-4xl font-bold', getScoreColor(result.metrics.quality_score))}>
                    {result.metrics.quality_score}
                  </div>
                  <div className="w-full mt-2">
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn('h-full rounded-full bg-gradient-to-r', getScoreGradient(result.metrics.quality_score))}
                        style={{ width: `${result.metrics.quality_score}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TestTube className="h-4 w-4" />
                  Test Coverage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center">
                  <div className={cn('text-4xl font-bold', getScoreColor(result.test_coverage_estimate))}>
                    {result.test_coverage_estimate}%
                  </div>
                  <div className="w-full mt-2">
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn('h-full rounded-full bg-gradient-to-r', getScoreGradient(result.test_coverage_estimate))}
                        style={{ width: `${result.test_coverage_estimate}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Documentation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center">
                  <div className={cn('text-4xl font-bold', getScoreColor(result.documentation_score))}>
                    {result.documentation_score}
                  </div>
                  <div className="w-full mt-2">
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn('h-full rounded-full bg-gradient-to-r', getScoreGradient(result.documentation_score))}
                        style={{ width: `${result.documentation_score}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats Row */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">{result.total_files}</p>
                  <p className="text-sm text-muted-foreground">Total Files</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">{result.total_lines.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Lines of Code</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">{result.issues.length}</p>
                  <p className="text-sm text-muted-foreground">Total Issues</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Issue Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Issue Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4">
                {Object.entries(result.summary).map(([severity, count]) => {
                  const config = severityConfig[severity as keyof typeof severityConfig]
                  const Icon = config?.icon || Info
                  return (
                    <button
                      key={severity}
                      onClick={() => {
                        setSelectedSeverity(selectedSeverity === severity ? null : severity)
                        setActiveTab('issues')
                      }}
                      className={cn(
                        'p-4 rounded-lg border-2 transition-all hover:scale-105',
                        config?.color
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Icon className="h-5 w-5" />
                        <span className="text-2xl font-bold">{count}</span>
                      </div>
                      <p className="text-sm font-medium capitalize">{severity}</p>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Languages & Tech Stack */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Languages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(result.languages)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([lang, lines]) => {
                      const pct = Math.round((lines / result.total_lines) * 100)
                      return (
                        <div key={lang}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{lang}</span>
                            <span className="text-muted-foreground">{pct}%</span>
                          </div>
                          <Progress value={pct} className="h-2" />
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Tech Stack
                </CardTitle>
              </CardHeader>
              <CardContent>
                {result.tech_stack.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {result.tech_stack.map((tech, i) => {
                      const Icon = techCategoryIcons[tech.category] || Package
                      return (
                        <Badge key={i} variant="secondary" className="flex items-center gap-1 py-1">
                          <Icon className="h-3 w-3" />
                          {tech.name}
                          {tech.version && <span className="text-muted-foreground">v{tech.version}</span>}
                        </Badge>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No tech stack detected</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Hot Files */}
          {result.hot_files.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  Hot Files (Most Changed)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.hot_files.slice(0, 5).map((file, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          'px-2 py-1 rounded text-xs font-medium',
                          file.status === 'hot' ? 'bg-red-500/20 text-red-500' :
                          file.status === 'warm' ? 'bg-orange-500/20 text-orange-500' :
                          'bg-green-500/20 text-green-500'
                        )}>
                          {file.status}
                        </span>
                        <code className="text-sm">{file.file}</code>
                      </div>
                      <span className="text-muted-foreground text-sm">{file.changes} changes</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Issues Tab */}
        <TabsContent value="issues" className="space-y-4">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-muted-foreground mr-2">Filter:</span>
            {Object.entries(categoryConfig).map(([category, config]) => {
              const count = result.metrics.category_breakdown[category] || 0
              if (count === 0) return null
              const Icon = config.icon
              return (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                  className="gap-1"
                >
                  <Icon className="h-3 w-3" />
                  {config.label} ({count})
                </Button>
              )
            })}
            {(selectedSeverity || selectedCategory) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedSeverity(null)
                  setSelectedCategory(null)
                }}
              >
                Clear
              </Button>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Issues ({filteredIssues.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {filteredIssues.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                      <p>No issues found matching the selected filters</p>
                    </div>
                  ) : (
                    filteredIssues.map((issue, index) => {
                      const severityConf = severityConfig[issue.severity as keyof typeof severityConfig]
                      const categoryConf = categoryConfig[issue.category]
                      const SeverityIcon = severityConf?.icon || Info
                      const CategoryIcon = categoryConf?.icon || Code
                      const isExpanded = expandedIssues.has(index)

                      return (
                        <div
                          key={index}
                          className={cn(
                            'border rounded-lg transition-all',
                            isExpanded ? 'bg-muted/50' : 'hover:bg-muted/30'
                          )}
                        >
                          <button
                            onClick={() => toggleIssue(index)}
                            className="w-full p-4 text-left"
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn('p-2 rounded-lg shrink-0', severityConf?.color)}>
                                <SeverityIcon className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-medium">{issue.title}</h4>
                                  <Badge className={cn('text-xs', severityConf?.color)}>
                                    {issue.severity}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs gap-1">
                                    <CategoryIcon className="h-3 w-3" />
                                    {categoryConf?.label || issue.category}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {issue.file_path}:{issue.line_number}
                                </p>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                              )}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="px-4 pb-4 space-y-3">
                              <div className="pl-11">
                                <p className="text-sm text-muted-foreground">{issue.description}</p>
                                {issue.code_snippet && (
                                  <pre className="mt-3 bg-muted p-3 rounded-md text-sm overflow-x-auto font-mono">
                                    <code>{issue.code_snippet}</code>
                                  </pre>
                                )}
                                <div className="mt-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
                                  <div className="flex items-start gap-2">
                                    <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-sm font-medium text-primary">Suggestion</p>
                                      <p className="text-sm mt-1">{issue.suggestion}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>File Health Report</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {result.file_reports.map((file, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={cn('w-2 h-10 rounded-full', getHealthColor(file.health_score))} />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{file.file_path}</p>
                          <p className="text-sm text-muted-foreground">
                            {file.language} · {file.lines} lines
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <p className="text-sm font-medium">{file.issues_count} issues</p>
                          <p className={cn('text-sm', getScoreColor(file.health_score))}>
                            {file.health_score}% health
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Complexity Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Functions</span>
                  <span className="font-bold text-2xl">{result.complexity_metrics.total_functions}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Avg Function Length</span>
                  <span className="font-bold">{result.complexity_metrics.average_function_length.toFixed(1)} lines</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Avg Complexity</span>
                  <span className="font-bold">{result.complexity_metrics.average_function_complexity.toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Long Functions (&gt;50 lines)</span>
                  <Badge variant={result.complexity_metrics.long_functions > 0 ? 'destructive' : 'secondary'}>
                    {result.complexity_metrics.long_functions}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Issue Density
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Issues per 1000 lines</span>
                  <span className="font-bold text-2xl">{result.metrics.issues_per_1000_lines}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Issues</span>
                  <span className="font-bold">{result.issues.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Avg Issues per File</span>
                  <span className="font-bold">
                    {(result.issues.length / result.total_files).toFixed(1)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tech Stack Tab */}
        <TabsContent value="tech" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {['framework', 'library', 'tool', 'language'].map(category => {
              const items = result.tech_stack.filter(t => t.category === category)
              if (items.length === 0) return null
              const Icon = techCategoryIcons[category] || Package
              return (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 capitalize">
                      <Icon className="h-5 w-5" />
                      {category}s
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {items.map((tech, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <span className="font-medium">{tech.name}</span>
                          {tech.version && (
                            <Badge variant="outline">v{tech.version}</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
