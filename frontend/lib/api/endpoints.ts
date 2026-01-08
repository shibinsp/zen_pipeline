import apiClient from './client'
import type {
  User,
  Repository,
  ScanResult,
  Vulnerability,
  Deployment,
  RiskScoreResponse,
  TestRun,
  FlakyTest,
  ArchitectureRule,
  DependencyGraph,
  AuditLog,
  DashboardStats,
  Integration,
  PaginatedResponse,
} from '@/types'

// Auth
export const auth = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),
  register: (data: { email: string; password: string; name: string }) =>
    apiClient.post('/auth/register', data),
  refresh: (refresh_token: string) =>
    apiClient.post('/auth/refresh', { refresh_token }),
  me: () => apiClient.get<User>('/auth/me'),
  logout: () => apiClient.post('/auth/logout'),
}

// Users
export const users = {
  list: (params?: { page?: number; search?: string; role?: string }) =>
    apiClient.get<PaginatedResponse<User>>('/users', { params }),
  get: (id: string) => apiClient.get<User>(`/users/${id}`),
  create: (data: Partial<User> & { password: string }) =>
    apiClient.post<User>('/users', data),
  update: (id: string, data: Partial<User>) =>
    apiClient.patch<User>(`/users/${id}`, data),
  delete: (id: string) => apiClient.delete(`/users/${id}`),
}

// Repositories
export const repositories = {
  list: (params?: { page?: number; search?: string; provider?: string }) =>
    apiClient.get<PaginatedResponse<Repository>>('/repositories', { params }),
  get: (id: string) => apiClient.get<Repository>(`/repositories/${id}`),
  create: (data: Partial<Repository>) =>
    apiClient.post<Repository>('/repositories', data),
  update: (id: string, data: Partial<Repository>) =>
    apiClient.patch<Repository>(`/repositories/${id}`, data),
  delete: (id: string) => apiClient.delete(`/repositories/${id}`),
}

// Analysis
export const analysis = {
  triggerScan: (data: { repository_id: string; commit_sha: string; scan_type: string }) =>
    apiClient.post<ScanResult>('/analysis/scan', data),
  getScan: (id: string) => apiClient.get<ScanResult>(`/analysis/scan/${id}`),
  listScans: (params?: { repository_id?: string; scan_type?: string; status?: string; page?: number }) =>
    apiClient.get<PaginatedResponse<ScanResult>>('/analysis/scans', { params }),
  listVulnerabilities: (params?: { repository_id?: string; severity?: string; status?: string; page?: number }) =>
    apiClient.get<PaginatedResponse<Vulnerability>>('/analysis/vulnerabilities', { params }),
  getPRAnalysis: (prId: string, repositoryId: string) =>
    apiClient.get(`/analysis/pr/${prId}`, { params: { repository_id: repositoryId } }),
  getCodeMetrics: (repoId: string) =>
    apiClient.get(`/analysis/metrics/${repoId}`),
  updateVulnerabilityStatus: (id: string, status: string) =>
    apiClient.patch(`/analysis/vulnerabilities/${id}/status`, null, { params: { status } }),
}

// Deployments
export const deployments = {
  calculateRiskScore: (data: { repository_id: string; commit_sha: string; environment: string }) =>
    apiClient.post<RiskScoreResponse>('/deployments/risk-score', data),
  list: (params?: { repository_id?: string; environment?: string; status?: string; page?: number }) =>
    apiClient.get<PaginatedResponse<Deployment>>('/deployments', { params }),
  create: (data: Partial<Deployment>) =>
    apiClient.post<Deployment>('/deployments', data),
  get: (id: string) => apiClient.get<Deployment>(`/deployments/${id}`),
  rollback: (id: string, reason?: string) =>
    apiClient.post<Deployment>(`/deployments/${id}/rollback`, { reason }),
  getImpact: (id: string) => apiClient.get(`/deployments/${id}/impact`),
  compareEnvironments: (repositoryId: string) =>
    apiClient.get('/deployments/environments/compare', { params: { repository_id: repositoryId } }),
}

// Tests
export const tests = {
  selectTests: (data: { repository_id: string; commit_sha: string; changed_files: string[] }) =>
    apiClient.post('/tests/select', data),
  getHistory: (repoId: string, period?: string) =>
    apiClient.get(`/tests/history/${repoId}`, { params: { period } }),
  getFlakyTests: (repoId: string, params?: { status?: string; page?: number }) =>
    apiClient.get<PaginatedResponse<FlakyTest>>(`/tests/flaky/${repoId}`, { params }),
  submitResults: (data: { test_run_id: string; tests: unknown[] }) =>
    apiClient.post<TestRun>('/tests/results', data),
  createRun: (data: Partial<TestRun>) =>
    apiClient.post<TestRun>('/tests', data),
  listRuns: (params?: { repository_id?: string; status?: string; page?: number }) =>
    apiClient.get<PaginatedResponse<TestRun>>('/tests/runs', { params }),
  updateFlakyTestStatus: (id: string, status: string) =>
    apiClient.patch(`/tests/flaky/${id}/status`, null, { params: { status } }),
  getCoverage: (repoId: string, commitSha?: string) =>
    apiClient.get(`/tests/coverage/${repoId}`, { params: { commit_sha: commitSha } }),
}

// Architecture
export const architecture = {
  getDependencies: (repoId: string) =>
    apiClient.get<DependencyGraph>(`/architecture/dependencies/${repoId}`),
  validate: (data: { repository_id: string; commit_sha?: string; rules?: string[] }) =>
    apiClient.post('/architecture/validate', data),
  getDriftReport: (repoId: string) =>
    apiClient.get(`/architecture/drift/${repoId}`),
  listRules: (params?: { organization_id?: string; rule_type?: string; enabled?: boolean; page?: number }) =>
    apiClient.get<PaginatedResponse<ArchitectureRule>>('/architecture/rules', { params }),
  createRule: (data: Partial<ArchitectureRule>) =>
    apiClient.post<ArchitectureRule>('/architecture/rules', data),
  getRule: (id: string) => apiClient.get<ArchitectureRule>(`/architecture/rules/${id}`),
  updateRule: (id: string, data: Partial<ArchitectureRule>) =>
    apiClient.patch<ArchitectureRule>(`/architecture/rules/${id}`, data),
  deleteRule: (id: string) => apiClient.delete(`/architecture/rules/${id}`),
  getComplianceStatus: (repoId: string) =>
    apiClient.get(`/architecture/compliance/${repoId}`),
}

// Admin
export const admin = {
  // User management
  listUsers: (params?: { page?: number; search?: string; organization_id?: string; role?: string }) =>
    apiClient.get('/admin/users', { params }),
  updateUserRole: (userId: string, role: string) =>
    apiClient.patch(`/admin/users/${userId}/role`, { role }),
  updateUserStatus: (userId: string, isActive: boolean) =>
    apiClient.patch(`/admin/users/${userId}/status`, { is_active: isActive }),
  deleteUser: (userId: string) =>
    apiClient.delete(`/admin/users/${userId}`),

  // Team management
  listTeams: (params?: { page?: number; search?: string }) =>
    apiClient.get('/admin/teams', { params }),
  getTeam: (teamId: string) =>
    apiClient.get(`/admin/teams/${teamId}`),
  createTeam: (data: { name: string; description?: string }) =>
    apiClient.post('/admin/teams', data),
  updateTeam: (teamId: string, data: { name?: string; description?: string }) =>
    apiClient.patch(`/admin/teams/${teamId}`, data),
  deleteTeam: (teamId: string) =>
    apiClient.delete(`/admin/teams/${teamId}`),
  addTeamMember: (teamId: string, userId: string, role: string = 'member') =>
    apiClient.post(`/admin/teams/${teamId}/members`, { user_id: userId, role }),
  removeTeamMember: (teamId: string, userId: string) =>
    apiClient.delete(`/admin/teams/${teamId}/members/${userId}`),

  // Organization settings
  getSettings: () =>
    apiClient.get('/admin/settings'),
  updateSettings: (data: { name?: string; slug?: string; settings?: Record<string, unknown> }) =>
    apiClient.patch('/admin/settings', data),

  // Audit logs
  getAuditLogs: (params?: { page?: number; action?: string; resource_type?: string; user_id?: string; start_date?: string; end_date?: string }) =>
    apiClient.get<PaginatedResponse<AuditLog>>('/admin/audit-logs', { params }),

  // Usage & Dashboard
  getUsageMetrics: (period?: string) =>
    apiClient.get('/admin/usage', { params: { period } }),
  getDashboardStats: () =>
    apiClient.get<DashboardStats>('/admin/dashboard-stats'),

  // Integrations
  listIntegrations: () =>
    apiClient.get<{ integrations: Integration[] }>('/admin/integrations'),
  connectIntegration: (id: string, config: Record<string, unknown>) =>
    apiClient.post(`/admin/integrations/${id}/connect`, config),
  disconnectIntegration: (id: string) =>
    apiClient.delete(`/admin/integrations/${id}`),
}

// Analytics
export const analytics = {
  getDoraMetrics: (period?: string) =>
    apiClient.get('/admin/analytics/dora-metrics', { params: { period } }),
  getDoraHistory: (weeks?: number) =>
    apiClient.get('/admin/analytics/dora-history', { params: { weeks } }),
  getRiskTrends: (period?: string) =>
    apiClient.get('/admin/analytics/risk-trends', { params: { period } }),
  getRecentActivity: (limit?: number) =>
    apiClient.get('/admin/analytics/activity', { params: { limit } }),
  getVulnerabilitySummary: () =>
    apiClient.get('/admin/analytics/vulnerabilities'),
  getTestEfficiency: (limit?: number) =>
    apiClient.get('/admin/analytics/test-efficiency', { params: { limit } }),
  getTeamPerformance: (period?: string) =>
    apiClient.get('/admin/analytics/team-performance', { params: { period } }),
  getTeamMetrics: () =>
    apiClient.get('/admin/analytics/team-metrics'),
  getTrends: (months?: number) =>
    apiClient.get('/admin/analytics/trends', { params: { months } }),
  getHealthStatus: () =>
    apiClient.get('/admin/analytics/health-status'),
}
