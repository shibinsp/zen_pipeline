'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { cn, getHealthScoreColor, getSeverityColor, formatRelativeTime } from '@/lib/utils'
import {
  Search,
  GitBranch,
  Shield,
  Bug,
  FileCode,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
} from 'lucide-react'

// Demo data
const repositories = [
  {
    id: '1',
    name: 'api-service',
    full_name: 'nxzen/api-service',
    provider: 'github',
    health_score: 'A',
    last_scan_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    vulnerabilities: { critical: 0, high: 2, medium: 5, low: 12 },
    coverage: 85,
    languages: { TypeScript: 65, JavaScript: 30, Other: 5 },
  },
  {
    id: '2',
    name: 'frontend-app',
    full_name: 'nxzen/frontend-app',
    provider: 'github',
    health_score: 'B',
    last_scan_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    vulnerabilities: { critical: 1, high: 4, medium: 8, low: 15 },
    coverage: 72,
    languages: { TypeScript: 80, CSS: 15, Other: 5 },
  },
  {
    id: '3',
    name: 'user-service',
    full_name: 'nxzen/user-service',
    provider: 'gitlab',
    health_score: 'A',
    last_scan_at: new Date(Date.now() - 1 * 3600000).toISOString(),
    vulnerabilities: { critical: 0, high: 1, medium: 3, low: 8 },
    coverage: 91,
    languages: { Python: 85, SQL: 10, Other: 5 },
  },
  {
    id: '4',
    name: 'payment-gateway',
    full_name: 'nxzen/payment-gateway',
    provider: 'github',
    health_score: 'C',
    last_scan_at: new Date(Date.now() - 12 * 3600000).toISOString(),
    vulnerabilities: { critical: 2, high: 6, medium: 12, low: 20 },
    coverage: 65,
    languages: { Java: 70, Kotlin: 25, Other: 5 },
  },
]

const vulnerabilities = [
  {
    id: '1',
    title: 'SQL Injection vulnerability in user query',
    severity: 'critical',
    file_path: 'src/services/user.py',
    line_number: 45,
    cwe_id: 'CWE-89',
    status: 'open',
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
  {
    id: '2',
    title: 'Cross-Site Scripting (XSS) in comment field',
    severity: 'high',
    file_path: 'src/components/CommentBox.tsx',
    line_number: 78,
    cwe_id: 'CWE-79',
    status: 'in_progress',
    created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
  },
  {
    id: '3',
    title: 'Insecure direct object reference',
    severity: 'high',
    file_path: 'src/api/endpoints.py',
    line_number: 123,
    cwe_id: 'CWE-639',
    status: 'open',
    created_at: new Date(Date.now() - 72 * 3600000).toISOString(),
  },
  {
    id: '4',
    title: 'Hardcoded credentials detected',
    severity: 'medium',
    file_path: 'src/config/database.py',
    line_number: 12,
    cwe_id: 'CWE-798',
    status: 'resolved',
    created_at: new Date(Date.now() - 96 * 3600000).toISOString(),
  },
]

export default function CodeAnalysisPage() {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredRepos = repositories.filter(
    (repo) =>
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
        <Button>
          <Search className="mr-2 h-4 w-4" />
          New Scan
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Repos</p>
                <p className="text-2xl font-bold">{repositories.length}</p>
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
                <p className="text-2xl font-bold text-red-500">3</p>
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
                <p className="text-2xl font-bold">78%</p>
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
                <p className="text-2xl font-bold">24</p>
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

          {/* Repository Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {filteredRepos.map((repo) => (
              <Card key={repo.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileCode className="h-5 w-5" />
                      {repo.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{repo.full_name}</p>
                  </div>
                  <Badge className={cn('text-lg font-bold', getHealthScoreColor(repo.health_score))}>
                    {repo.health_score}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Vulnerabilities */}
                    <div>
                      <p className="text-sm font-medium mb-2">Vulnerabilities</p>
                      <div className="flex gap-2">
                        {repo.vulnerabilities.critical > 0 && (
                          <Badge variant="error">{repo.vulnerabilities.critical} Critical</Badge>
                        )}
                        {repo.vulnerabilities.high > 0 && (
                          <Badge variant="warning">{repo.vulnerabilities.high} High</Badge>
                        )}
                        <Badge variant="info">{repo.vulnerabilities.medium} Medium</Badge>
                        <Badge variant="secondary">{repo.vulnerabilities.low} Low</Badge>
                      </div>
                    </div>

                    {/* Coverage */}
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Test Coverage</span>
                        <span className="font-medium">{repo.coverage}%</span>
                      </div>
                      <Progress value={repo.coverage} className="h-2" />
                    </div>

                    {/* Languages */}
                    <div className="flex gap-2">
                      {Object.entries(repo.languages).map(([lang, percent]) => (
                        <span key={lang} className="text-xs text-muted-foreground">
                          {lang} {percent}%
                        </span>
                      ))}
                    </div>

                    {/* Last Scan */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Last scan</span>
                      <span>{formatRelativeTime(repo.last_scan_at)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="vulnerabilities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Open Vulnerabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vulnerabilities.map((vuln) => (
                  <div
                    key={vuln.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex gap-4">
                      <div className={cn('p-2 rounded-lg', getSeverityColor(vuln.severity))}>
                        <Bug className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium">{vuln.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {vuln.file_path}:{vuln.line_number}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Badge className={cn(getSeverityColor(vuln.severity))}>
                            {vuln.severity}
                          </Badge>
                          <Badge variant="outline">{vuln.cwe_id}</Badge>
                          <Badge variant={vuln.status === 'resolved' ? 'success' : 'secondary'}>
                            {vuln.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Code Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cyclomatic Complexity</span>
                  <span className="font-medium">12.5</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cognitive Complexity</span>
                  <span className="font-medium">18.3</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lines of Code</span>
                  <span className="font-medium">45,230</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duplicated Lines</span>
                  <span className="font-medium">3.2%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Technical Debt</span>
                  <span className="font-medium">120 hours</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Code Smells</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-4xl font-bold">45</p>
                  <p className="text-muted-foreground">Total code smells detected</p>
                  <div className="flex justify-center gap-4 mt-4">
                    <div className="text-center">
                      <p className="text-xl font-bold text-red-500">8</p>
                      <p className="text-xs text-muted-foreground">Blocker</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-orange-500">15</p>
                      <p className="text-xs text-muted-foreground">Major</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-yellow-500">22</p>
                      <p className="text-xs text-muted-foreground">Minor</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
