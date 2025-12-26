'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  Github,
  Search,
  Shield,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Code,
  FileCode,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Copy,
  RefreshCw,
  Zap,
  Bug,
  Lock,
  FileWarning,
  Lightbulb,
  Download,
  FileJson,
  FileText,
  Flame,
  TestTube,
  BookOpen,
  GitBranch,
  Layers,
  Activity,
  TrendingUp,
  Package,
  Server,
  Wrench,
} from 'lucide-react'
import { apiClient } from '@/lib/api/client'

interface CodeIssue {
  file_path: string
  line_number: number
  category: string
  severity: string
  title: string
  description: string
  suggestion: string
  code_snippet: string
}

interface TechStackItem {
  name: string
  category: string
  version?: string
}

interface FileReport {
  file_path: string
  language: string
  lines: number
  issues_count: number
  health_score: number
  issues: any[]
}

interface HotFile {
  file: string
  changes: number
  status: string
}

interface ReviewResult {
  repository_url: string
  repository_name: string
  branch: string
  analyzed_at: string
  total_files: number
  total_lines: number
  languages: Record<string, number>
  summary: Record<string, number>
  issues: CodeIssue[]
  metrics: {
    category_breakdown: Record<string, number>
    issues_per_1000_lines: number
    security_score: number
    quality_score: number
    test_metrics?: {
      test_files: number
      test_lines: number
      source_lines: number
      test_ratio: number
    }
    readme_score?: number
    readme_issues?: string[]
  }
  recommendations: string[]
  tech_stack: TechStackItem[]
  file_reports: FileReport[]
  documentation_score: number
  test_coverage_estimate: number
  complexity_metrics: {
    average_file_complexity: number
    average_function_length: number
    average_function_complexity: number
    total_functions: number
    long_functions: number
    complex_functions: number
  }
  hot_files: HotFile[]
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

export default function GitHubReviewPage() {
  const [repoUrl, setRepoUrl] = useState('')
  const [branch, setBranch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ReviewResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedIssues, setExpandedIssues] = useState<Set<number>>(new Set())
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  const handleReview = async () => {
    if (!repoUrl.trim()) {
      setError('Please enter a GitHub repository URL')
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await apiClient.post('/github/review', {
        repository_url: repoUrl.trim(),
        branch: branch.trim() || undefined
      })
      setResult(response.data)
      setActiveTab('overview')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to analyze repository. Please check the URL and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async (format: 'json' | 'markdown') => {
    if (!result) return
    const [owner, repo] = result.repository_name.split('/')
    const url = `${apiClient.defaults.baseURL}/github/export/${owner}/${repo}?format=${format}`
    window.open(url, '_blank')
  }

  const toggleIssue = (index: number) => {
    const newExpanded = new Set(expandedIssues)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedIssues(newExpanded)
  }

  const filteredIssues = result?.issues.filter(issue => {
    if (selectedSeverity && issue.severity !== selectedSeverity) return false
    if (selectedCategory && issue.category !== selectedCategory) return false
    return true
  }) || []

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
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Github className="h-8 w-8" />
            GitHub Code Review
          </h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive code analysis for security, quality, complexity, and best practices
          </p>
        </div>
        {result && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
              <FileJson className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('markdown')}>
              <FileText className="h-4 w-4 mr-2" />
              Export Markdown
            </Button>
          </div>
        )}
      </div>

      {/* URL Input Section */}
      <Card className="border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-full bg-primary/10">
              <Github className="h-12 w-12 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">Analyze a GitHub Repository</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Enter the URL of any public GitHub repository to start comprehensive analysis
              </p>
            </div>
            <div className="flex w-full max-w-3xl gap-3">
              <div className="relative flex-1">
                <Github className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="https://github.com/owner/repository"
                  className="pl-11 h-12 text-lg"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleReview()}
                  disabled={isLoading}
                />
              </div>
              <div className="relative w-40">
                <GitBranch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Branch (optional)"
                  className="pl-10 h-12"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <Button
                size="lg"
                className="h-12 px-8"
                onClick={handleReview}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-5 w-5" />
                    Analyze
                  </>
                )}
              </Button>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-500 bg-red-500/10 px-4 py-2 rounded-lg">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <Code className="h-6 w-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold">Analyzing Repository</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Cloning, scanning for issues, analyzing complexity, detecting tech stack...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Section */}
      {result && (
        <div className="space-y-6">
          {/* Tabs for different views */}
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
              {/* Repository Info & Scores */}
              <div className="grid gap-4 md:grid-cols-5">
                <Card className="md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Github className="h-5 w-5" />
                      {result.repository_name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-4">
                      <a
                        href={result.repository_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        View on GitHub <ExternalLink className="h-3 w-3" />
                      </a>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <GitBranch className="h-3 w-3" />
                        {result.branch}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold">{result.total_files}</p>
                        <p className="text-xs text-muted-foreground">Files</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{result.total_lines.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Lines</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{result.issues.length}</p>
                        <p className="text-xs text-muted-foreground">Issues</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Security
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
                      Quality
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
                      Tests
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

              {/* Languages & Tech Stack Row */}
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
                        .map(([lang, lines]) => {
                          const pct = Math.round((lines / result.total_lines) * 100)
                          return (
                            <div key={lang}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="font-medium">{lang}</span>
                                <span className="text-muted-foreground">{lines.toLocaleString()} lines ({pct}%)</span>
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
                    <CardDescription>Files with the most recent git commits - potential areas of concern</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {result.hot_files.slice(0, 8).map((file, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              'px-2 py-1 rounded text-xs font-medium',
                              file.status === 'hot' ? 'bg-red-500/20 text-red-500' :
                              file.status === 'warm' ? 'bg-orange-500/20 text-orange-500' :
                              'bg-green-500/20 text-green-500'
                            )}>
                              {file.status === 'hot' ? '🔥' : file.status === 'warm' ? '🌡️' : '✅'} {file.status}
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
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              {/* Issues List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Issues ({filteredIssues.length})</span>
                    {filteredIssues.length !== result.issues.length && (
                      <Badge variant="secondary">Filtered from {result.issues.length}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px] pr-4">
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
                                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                                      <FileCode className="h-4 w-4" />
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
                                      <div className="mt-3">
                                        <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto font-mono">
                                          <code>{issue.code_snippet}</code>
                                        </pre>
                                      </div>
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
                  <CardDescription>Files sorted by number of issues</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
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
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Complex Functions</span>
                      <Badge variant={result.complexity_metrics.complex_functions > 0 ? 'destructive' : 'secondary'}>
                        {result.complexity_metrics.complex_functions}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TestTube className="h-5 w-5" />
                      Test Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Est. Coverage</span>
                      <span className={cn('font-bold text-2xl', getScoreColor(result.test_coverage_estimate))}>
                        {result.test_coverage_estimate}%
                      </span>
                    </div>
                    {result.metrics.test_metrics && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Test Files</span>
                          <span className="font-bold">{result.metrics.test_metrics.test_files}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Test Lines</span>
                          <span className="font-bold">{result.metrics.test_metrics.test_lines.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Test Ratio</span>
                          <span className="font-bold">
                            {(result.metrics.test_metrics.test_ratio * 100).toFixed(1)}%
                          </span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Documentation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">README Score</span>
                      <span className={cn('font-bold text-2xl', getScoreColor(result.documentation_score))}>
                        {result.documentation_score}/100
                      </span>
                    </div>
                    {result.metrics.readme_issues && result.metrics.readme_issues.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Issues:</p>
                        <ul className="space-y-1">
                          {result.metrics.readme_issues.map((issue, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                              {issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
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

              {result.tech_stack.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No tech stack detected</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add package.json, requirements.txt, or other dependency files
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}
