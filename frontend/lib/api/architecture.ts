import apiClient from './client'
import type { PaginatedResponse } from '@/types'

export interface DependencyNode {
  id: string
  name: string
  type: string
  size?: number
  health_score?: number
  file_count?: number
}

export interface DependencyEdge {
  source: string
  target: string
  weight?: number
  type: string
}

export interface DependencyGraph {
  repository_id: string
  nodes: DependencyNode[]
  edges: DependencyEdge[]
  circular_dependencies: string[][]
  layers?: Record<string, string[]>
}

export interface ArchitectureRule {
  id: string
  organization_id: string
  name: string
  description?: string
  rule_type: string
  severity: string
  rule_definition: Record<string, unknown>
  enabled: boolean
  created_at: string
  updated_at?: string
  violations_count?: number
}

export interface Violation {
  id: string
  repository_id: string
  rule_id: string
  rule_name?: string
  source_module: string
  target_module: string
  violation_type: string
  file_path?: string
  line_number?: string
  details: Record<string, unknown>
  is_resolved: boolean
  detected_at: string
  resolved_at?: string
}

export interface ValidationResult {
  rule_id: string
  rule_name: string
  passed: boolean
  violations: Violation[]
}

export interface ValidateResponse {
  repository_id: string
  passed: boolean
  total_rules: number
  passed_rules: number
  failed_rules: number
  results: ValidationResult[]
}

export interface DriftReport {
  repository_id: string
  baseline_date: string
  current_date: string
  drift_score: number
  changes: Array<{ type: string; module: string; details: string }>
  new_dependencies: string[]
  removed_dependencies: string[]
  layer_violations: Violation[]
  recommendations: string[]
}

export interface ComplianceStatus {
  repository_id: string
  overall_score: number
  rules_compliant: number
  rules_violated: number
  critical_violations: number
  last_checked: string
  trend: string
}

// Get dependency graph for a repository
export async function getDependencyGraph(repoId: string): Promise<DependencyGraph> {
  const response = await apiClient.get(`/architecture/dependencies/${repoId}`)
  return response.data
}

// Analyze repository and generate dependency graph from GitHub
export async function analyzeDependencies(repoId: string): Promise<DependencyGraph> {
  const response = await apiClient.post(`/architecture/analyze/${repoId}`)
  return response.data
}

// Validate architecture
export async function validateArchitecture(data: {
  repository_id: string
  commit_sha?: string
  rules?: string[]
}): Promise<ValidateResponse> {
  const response = await apiClient.post('/architecture/validate', data)
  return response.data
}

// Get drift report
export async function getDriftReport(repoId: string): Promise<DriftReport> {
  const response = await apiClient.get(`/architecture/drift/${repoId}`)
  return response.data
}

// Get compliance status
export async function getComplianceStatus(repoId: string): Promise<ComplianceStatus> {
  const response = await apiClient.get(`/architecture/compliance/${repoId}`)
  return response.data
}

// List architecture rules
export async function getArchitectureRules(
  organizationId?: string,
  ruleType?: string,
  enabled?: boolean,
  page: number = 1,
  pageSize: number = 50
): Promise<PaginatedResponse<ArchitectureRule>> {
  const params = new URLSearchParams()
  params.append('page', String(page))
  params.append('page_size', String(pageSize))
  if (organizationId) params.append('organization_id', organizationId)
  if (ruleType) params.append('rule_type', ruleType)
  if (enabled !== undefined) params.append('enabled', String(enabled))

  const response = await apiClient.get(`/architecture/rules?${params.toString()}`)
  return response.data
}

// Create a new rule
export async function createArchitectureRule(data: {
  organization_id: string
  name: string
  description?: string
  rule_type: string
  severity?: string
  rule_definition: Record<string, unknown>
  enabled?: boolean
}): Promise<ArchitectureRule> {
  const response = await apiClient.post('/architecture/rules', data)
  return response.data
}

// Get a single rule
export async function getArchitectureRule(ruleId: string): Promise<ArchitectureRule> {
  const response = await apiClient.get(`/architecture/rules/${ruleId}`)
  return response.data
}

// Update a rule
export async function updateArchitectureRule(
  ruleId: string,
  data: {
    name?: string
    description?: string
    severity?: string
    rule_definition?: Record<string, unknown>
    enabled?: boolean
  }
): Promise<ArchitectureRule> {
  const response = await apiClient.patch(`/architecture/rules/${ruleId}`, data)
  return response.data
}

// Delete a rule
export async function deleteArchitectureRule(ruleId: string): Promise<void> {
  await apiClient.delete(`/architecture/rules/${ruleId}`)
}
