'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn, getHealthScoreColor, getSeverityColor, formatRelativeTime } from '@/lib/utils'
import { NewScanDialog } from '@/components/code-analysis/new-scan-dialog'
import { ReviewResultView } from '@/components/code-analysis/review-result-view'
import {
  getRepositories,
  getVulnerabilities,
} from '@/lib/api/code-analysis'
import type { Repository, Vulnerability, GitHubReviewResult } from '@/types'
import {
  Search,
  GitBranch,
  Shield,
  Bug,
  FileCode,
  AlertTriangle,
  Clock,
  ExternalLink,
  Filter,
  Plus,
  Loader2,
  RefreshCw,
} from 'lucide-react'

export default function CodeAnalysisPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([])
  const [reviewResult, setReviewResult] = useState<GitHubReviewResult | null>(null)
  const [selectedRepoForScan, setSelectedRepoForScan] = useState<Repository | null>(null)
  const [stats, setStats] = useState({
    totalRepos: 0,
    criticalIssues: 0,
    avgCoverage: 0,
    scansToday: 0,
  })

  // Extract security vulnerabilities from analyzed repositories
  const securityIssues = useMemo(() => {
    const issues: Array<{
      id: string
      repoName: string
      repoId: string
      title: string
      description: string
      file_path: string
      line_number: number
      severity: string
      category: string
      suggestion: string
    }> = []

    repositories.forEach(repo => {
      if (repo.last_review_data?.issues) {
        repo.last_review_data.issues.forEach((issue, index) => {
          // Include security-related issues
          const securityCategories = ['security', 'vulnerability', 'injection', 'xss', 'auth', 'crypto', 'sensitive']
          const isSecurityIssue = securityCategories.some(cat =>
            issue.category?.toLowerCase().includes(cat) ||
            issue.title?.toLowerCase().includes(cat) ||
            issue.severity === 'critical' ||
            issue.severity === 'high'
          )

          if (isSecurityIssue || issue.severity === 'critical' || issue.severity === 'high') {
            issues.push({
              id: `${repo.id}-${index}`,
              repoName: repo.name,
              repoId: repo.id,
              title: issue.title,
              description: issue.description,
              file_path: issue.file_path,
              line_number: issue.line_number,
              severity: issue.severity,
              category: issue.category,
              suggestion: issue.suggestion,
            })
          }
        })
      }
    })

    // Sort by severity (critical first, then high, medium, low)
    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }
    return issues.sort((a, b) => (severityOrder[a.severity] || 5) - (severityOrder[b.severity] || 5))
  }, [repositories])

  // Compute aggregated quality metrics from analyzed repositories
  const qualityMetrics = useMemo(() => {
    const analyzedRepos = repositories.filter(r => r.last_review_data)

    if (analyzedRepos.length === 0) {
      return null
    }

    let totalLines = 0
    let totalFunctions = 0
    let longFunctions = 0
    let complexFunctions = 0
    let totalComplexity = 0
    let totalFunctionLength = 0
    let totalIssues = 0
    let criticalIssues = 0
    let highIssues = 0
    let mediumIssues = 0
    let lowIssues = 0
    let totalQualityScore = 0
    let totalSecurityScore = 0

    analyzedRepos.forEach(repo => {
      const data = repo.last_review_data!
      totalLines += data.total_lines || 0

      if (data.complexity_metrics) {
        totalFunctions += data.complexity_metrics.total_functions || 0
        longFunctions += data.complexity_metrics.long_functions || 0
        complexFunctions += data.complexity_metrics.complex_functions || 0
        totalComplexity += data.complexity_metrics.average_file_complexity || 0
        totalFunctionLength += data.complexity_metrics.average_function_length || 0
      }

      if (data.issues) {
        totalIssues += data.issues.length
        data.issues.forEach(issue => {
          if (issue.severity === 'critical') criticalIssues++
          else if (issue.severity === 'high') highIssues++
          else if (issue.severity === 'medium') mediumIssues++
          else lowIssues++
        })
      }

      if (data.metrics) {
        totalQualityScore += data.metrics.quality_score || 0
        totalSecurityScore += data.metrics.security_score || 0
      }
    })

    const repoCount = analyzedRepos.length
    return {
      totalLines,
      avgComplexity: repoCount > 0 ? (totalComplexity / repoCount).toFixed(1) : '0',
      avgFunctionLength: repoCount > 0 ? (totalFunctionLength / repoCount).toFixed(1) : '0',
      totalFunctions,
      longFunctions,
      complexFunctions,
      totalIssues,
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues,
      avgQualityScore: repoCount > 0 ? Math.round(totalQualityScore / repoCount) : 0,
      avgSecurityScore: repoCount > 0 ? Math.round(totalSecurityScore / repoCount) : 0,
      analyzedRepoCount: repoCount,
    }
  }, [repositories])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [reposResponse, vulnsResponse] = await Promise.all([
        getRepositories(searchQuery || undefined),
        getVulnerabilities(),
      ])

      setRepositories(reposResponse.items)
      setVulnerabilities(vulnsResponse.items)

      // Calculate stats from actual analysis data
      let criticalCount = 0
      let totalCoverage = 0
      let analyzedCount = 0

      reposResponse.items.forEach(repo => {
        if (repo.last_review_data) {
          analyzedCount++
          totalCoverage += repo.last_review_data.test_coverage_estimate || 0
          if (repo.last_review_data.issues) {
            criticalCount += repo.last_review_data.issues.filter(
              (i: { severity: string }) => i.severity === 'critical' || i.severity === 'high'
            ).length
          }
        }
      })

      setStats({
        totalRepos: reposResponse.total,
        criticalIssues: criticalCount,
        avgCoverage: analyzedCount > 0 ? Math.round(totalCoverage / analyzedCount) : 0,
        scansToday: reposResponse.items.filter(
          (r) => r.last_scan_at && new Date(r.last_scan_at).toDateString() === new Date().toDateString()
        ).length,
      })
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleScanSuccess = (result?: GitHubReviewResult) => {
    fetchData()
    if (result) {
      setReviewResult(result)
    }
  }

  const handleBackToList = () => {
    setReviewResult(null)
  }

  const handleRepoClick = (repo: Repository) => {
    if (repo.last_review_data) {
      // Show stored review data
      setReviewResult(repo.last_review_data)
    } else {
      // No previous analysis - open scan dialog with this repo pre-selected
      setSelectedRepoForScan(repo)
      setIsDialogOpen(true)
    }
  }

  const filteredRepos = repositories.filter(
    (repo) =>
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // If we have a review result, show it
  if (reviewResult) {
    return <ReviewResultView result={reviewResult} onBack={handleBackToList} />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Code Analysis</h1>
          <p className="text-muted-foreground">
            Security scanning and code quality analysis
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Scan
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Repos</p>
                <p className="text-2xl font-bold">{stats.totalRepos}</p>
              </div>
              <GitBranch className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical Issues</p>
                <p className="text-2xl font-bold text-red-500">{stats.criticalIssues}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Coverage</p>
                <p className="text-2xl font-bold">{stats.avgCoverage}%</p>
              </div>
              <Shield className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Scans Today</p>
                <p className="text-2xl font-bold">{stats.scansToday}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="repositories" className="space-y-4">
        <TabsList>
          <TabsTrigger value="repositories">Repositories</TabsTrigger>
          <TabsTrigger value="vulnerabilities">Vulnerabilities</TabsTrigger>
          <TabsTrigger value="quality">Code Quality</TabsTrigger>
        </TabsList>

        <TabsContent value="repositories" className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search repositories..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRepos.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No repositories yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Add your first repository to start scanning for vulnerabilities
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Repository
                </Button>
              </CardContent>
            </Card>
          ) : (
            /* Repository Grid */
            <div className="grid gap-4 md:grid-cols-2">
              {filteredRepos.map((repo) => (
                <Card key={repo.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleRepoClick(repo)}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileCode className="h-5 w-5" />
                        {repo.name}
                        {repo.last_review_data && (
                          <Badge variant="outline" className="ml-2 text-xs text-green-600 border-green-600">
                            Analyzed
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{repo.full_name}</p>
                    </div>
                    <Badge className={cn('text-lg font-bold', getHealthScoreColor(repo.health_score))}>
                      {repo.health_score}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Provider Badge */}
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {repo.provider}
                        </Badge>
                        <Badge variant="secondary">
                          {repo.default_branch}
                        </Badge>
                      </div>

                      {/* Languages */}
                      {repo.language_breakdown && Object.keys(repo.language_breakdown).length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {Object.entries(repo.language_breakdown).slice(0, 3).map(([lang, percent]) => (
                            <span key={lang} className="text-xs text-muted-foreground">
                              {lang} {percent}%
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Last Scan */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Last scan</span>
                        <span>
                          {repo.last_scan_at
                            ? formatRelativeTime(repo.last_scan_at)
                            : 'Never'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="vulnerabilities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Security Issues
                {securityIssues.length > 0 && (
                  <Badge variant="destructive">{securityIssues.length} issues</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : securityIssues.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Shield className="h-12 w-12 text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No security issues found</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    {repositories.some(r => r.last_review_data)
                      ? "Your analyzed repositories are looking secure!"
                      : "Run a code analysis to scan for security vulnerabilities"}
                  </p>
                  {!repositories.some(r => r.last_review_data) && (
                    <Button onClick={() => setIsDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Run Analysis
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {securityIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex gap-4">
                        <div className={cn('p-2 rounded-lg', getSeverityColor(issue.severity))}>
                          <Bug className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{issue.title}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            <span className="font-medium">{issue.repoName}</span> • {issue.file_path}:{issue.line_number}
                          </p>
                          {issue.description && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {issue.description}
                            </p>
                          )}
                          <div className="flex gap-2 mt-2 flex-wrap">
                            <Badge className={cn(getSeverityColor(issue.severity))}>
                              {issue.severity}
                            </Badge>
                            <Badge variant="outline">{issue.category}</Badge>
                          </div>
                          {issue.suggestion && (
                            <p className="text-sm text-primary mt-2">
                              <strong>Fix:</strong> {issue.suggestion}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          {!qualityMetrics ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileCode className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No analysis data yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Run a code analysis on your repositories to see quality metrics
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Run Analysis
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Code Metrics
                    <Badge variant="secondary" className="text-xs">
                      {qualityMetrics.analyzedRepoCount} repo{qualityMetrics.analyzedRepoCount !== 1 ? 's' : ''} analyzed
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Lines of Code</span>
                    <span className="font-medium">{qualityMetrics.totalLines.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg File Complexity</span>
                    <span className="font-medium">{qualityMetrics.avgComplexity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Function Length</span>
                    <span className="font-medium">{qualityMetrics.avgFunctionLength} lines</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Functions</span>
                    <span className="font-medium">{qualityMetrics.totalFunctions.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Long Functions</span>
                    <span className="font-medium text-yellow-600">{qualityMetrics.longFunctions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Complex Functions</span>
                    <span className="font-medium text-orange-600">{qualityMetrics.complexFunctions}</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Issues by Severity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-4">
                    <p className="text-4xl font-bold">{qualityMetrics.totalIssues}</p>
                    <p className="text-muted-foreground">Total issues detected</p>
                    <div className="flex justify-center gap-4 mt-4">
                      <div className="text-center">
                        <p className="text-xl font-bold text-red-500">{qualityMetrics.criticalIssues}</p>
                        <p className="text-xs text-muted-foreground">Critical</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-orange-500">{qualityMetrics.highIssues}</p>
                        <p className="text-xs text-muted-foreground">High</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-yellow-500">{qualityMetrics.mediumIssues}</p>
                        <p className="text-xs text-muted-foreground">Medium</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-blue-500">{qualityMetrics.lowIssues}</p>
                        <p className="text-xs text-muted-foreground">Low</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Quality Score</span>
                      <Badge className={cn(
                        qualityMetrics.avgQualityScore >= 80 ? 'bg-green-500' :
                        qualityMetrics.avgQualityScore >= 60 ? 'bg-yellow-500' :
                        qualityMetrics.avgQualityScore >= 40 ? 'bg-orange-500' : 'bg-red-500'
                      )}>
                        {qualityMetrics.avgQualityScore}%
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Security Score</span>
                      <Badge className={cn(
                        qualityMetrics.avgSecurityScore >= 80 ? 'bg-green-500' :
                        qualityMetrics.avgSecurityScore >= 60 ? 'bg-yellow-500' :
                        qualityMetrics.avgSecurityScore >= 40 ? 'bg-orange-500' : 'bg-red-500'
                      )}>
                        {qualityMetrics.avgSecurityScore}%
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* New Scan Dialog */}
      <NewScanDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) setSelectedRepoForScan(null)
        }}
        repositories={repositories}
        onSuccess={handleScanSuccess}
        preSelectedRepo={selectedRepoForScan}
      />
    </div>
  )
}
