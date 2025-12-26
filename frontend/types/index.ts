// User types
export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  organization_id?: string
  is_active: boolean
  avatar_url?: string
  last_login?: string
  created_at: string
}

export type UserRole = 'platform_admin' | 'org_admin' | 'team_lead' | 'developer' | 'viewer'

// Organization types
export interface Organization {
  id: string
  name: string
  slug: string
  plan: 'starter' | 'professional' | 'enterprise'
  settings: Record<string, unknown>
  logo_url?: string
  created_at: string
}

export interface Team {
  id: string
  name: string
  description?: string
  organization_id: string
  member_count?: number
  created_at: string
}

// Repository types
export interface Repository {
  id: string
  organization_id: string
  name: string
  full_name: string
  provider: 'github' | 'gitlab' | 'bitbucket' | 'azure_devops'
  url: string
  default_branch: string
  language_breakdown: Record<string, number>
  health_score: string
  last_scan_at?: string
  created_at: string
}

// Scan types
export interface ScanResult {
  id: string
  repository_id: string
  commit_sha: string
  branch?: string
  scan_type: 'security' | 'quality' | 'dependency'
  status: 'pending' | 'running' | 'completed' | 'failed'
  findings_count: number
  critical_count: number
  high_count: number
  medium_count: number
  low_count: number
  metrics: Record<string, unknown>
  started_at?: string
  completed_at?: string
  created_at: string
}

export interface Vulnerability {
  id: string
  scan_id: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  title: string
  description?: string
  file_path?: string
  line_number?: number
  cwe_id?: string
  cvss_score?: string
  status: 'open' | 'in_progress' | 'resolved' | 'ignored'
  recommendation?: string
  created_at: string
}

// Deployment types
export interface Deployment {
  id: string
  repository_id: string
  environment: 'development' | 'staging' | 'production'
  version: string
  commit_sha: string
  branch?: string
  risk_score: number
  risk_factors: Record<string, unknown>
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back'
  strategy: 'rolling' | 'canary' | 'blue_green' | 'recreate'
  deployed_by: string
  deployed_by_user?: User
  duration_seconds?: number
  notes?: string
  started_at?: string
  completed_at?: string
  created_at: string
}

export interface RiskFactor {
  category: string
  factor: string
  score: number
  weight: number
  description: string
}

export interface RiskScoreResponse {
  risk_score: number
  confidence_level: 'low' | 'medium' | 'high'
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  risk_factors: RiskFactor[]
  recommendations: string[]
  historical_success_rate?: number
}

// Test types
export interface TestRun {
  id: string
  repository_id: string
  commit_sha: string
  branch?: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  total_tests: number
  selected_tests: number
  passed: number
  failed: number
  skipped: number
  duration_ms: number
  coverage_percent?: number
  selection_accuracy?: number
  time_saved_percent?: number
  test_framework?: string
  created_at: string
}

export interface FlakyTest {
  id: string
  repository_id: string
  test_name: string
  test_file?: string
  test_suite?: string
  flakiness_score: number
  total_runs: number
  failure_count: number
  last_failure?: string
  status: 'active' | 'quarantined' | 'resolved'
  root_cause?: string
  created_at: string
}

// Architecture types
export interface ArchitectureRule {
  id: string
  organization_id: string
  name: string
  description?: string
  rule_type: 'dependency' | 'naming' | 'structure' | 'import' | 'layer'
  severity: 'error' | 'warning' | 'info'
  rule_definition: Record<string, unknown>
  enabled: boolean
  created_at: string
}

export interface DependencyNode {
  id: string
  name: string
  type: 'module' | 'package' | 'service'
  size?: number
  health_score?: number
}

export interface DependencyEdge {
  source: string
  target: string
  weight?: number
  type: 'import' | 'call' | 'data'
}

export interface DependencyGraph {
  repository_id: string
  nodes: DependencyNode[]
  edges: DependencyEdge[]
  circular_dependencies: string[][]
  layers?: Record<string, string[]>
}

// Audit types
export interface AuditLog {
  id: string
  user_id?: string
  action: string
  resource_type: string
  resource_id?: string
  details: Record<string, unknown>
  ip_address?: string
  status: string
  created_at: string
}

// Common types
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface DashboardStats {
  deployments_today: number
  active_scans: number
  test_pass_rate: number
  open_vulnerabilities: number
  system_health: string
  trends: {
    deployments: { value: number; direction: 'up' | 'down' }
    vulnerabilities: { value: number; direction: 'up' | 'down' }
    test_pass_rate: { value: number; direction: 'up' | 'down' }
  }
}

// Integration types
export interface Integration {
  id: string
  name: string
  type: 'source_control' | 'communication' | 'observability' | 'ticketing' | 'ci_cd'
  status: 'connected' | 'disconnected'
  connected_at?: string
  config: Record<string, unknown>
}
