import apiClient from './client'
import type { PaginatedResponse } from '@/types'

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
  triggered_by?: string
  started_at?: string
  completed_at?: string
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
  last_success?: string
  status: 'active' | 'quarantined' | 'resolved'
  root_cause?: string
  created_at: string
}

export interface SelectedTest {
  test_name: string
  test_file: string
  priority_score: number
  failure_probability: number
  reasons: string[]
}

export interface TestSelectionResponse {
  repository_id: string
  commit_sha: string
  total_tests: number
  selected_count: number
  estimated_time_saved_percent: number
  selected_tests: SelectedTest[]
  confidence_score: number
}

export interface TestHistoryResponse {
  repository_id: string
  period: string
  total_runs: number
  avg_pass_rate: number
  avg_duration_ms: number
  avg_selection_accuracy: number
  avg_time_saved: number
  trend: 'improving' | 'stable' | 'declining'
  runs: TestRun[]
}

export interface CoverageReport {
  repository_id: string
  commit_sha: string
  overall_coverage: number
  line_coverage: number
  branch_coverage: number
  function_coverage: number
  files: Array<{
    path: string
    coverage: number
    uncovered_lines: number[]
  }>
}

// Get all test runs
export async function getTestRuns(
  repositoryId?: string,
  status?: string,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResponse<TestRun>> {
  const params = new URLSearchParams()
  params.append('page', String(page))
  params.append('page_size', String(pageSize))
  if (repositoryId) params.append('repository_id', repositoryId)
  if (status) params.append('status', status)

  const response = await apiClient.get(`/tests/runs?${params.toString()}`)
  return response.data
}

// Create a new test run
export async function createTestRun(data: {
  repository_id: string
  commit_sha: string
  branch?: string
  test_framework?: string
  triggered_by?: string
  total_tests?: number
  selected_tests?: number
  time_saved_percent?: number
}): Promise<TestRun> {
  const response = await apiClient.post('/tests', data)
  return response.data
}

// Get test selection (ML-based)
export async function selectTests(data: {
  repository_id: string
  commit_sha: string
  changed_files: string[]
  base_branch?: string
}): Promise<TestSelectionResponse> {
  const response = await apiClient.post('/tests/select', data)
  return response.data
}

// Get test history for a repository
export async function getTestHistory(
  repositoryId: string,
  period: '7d' | '30d' | '90d' = '7d'
): Promise<TestHistoryResponse> {
  const response = await apiClient.get(`/tests/history/${repositoryId}?period=${period}`)
  return response.data
}

// Get flaky tests for a repository
export async function getFlakyTests(
  repositoryId: string,
  status?: string,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResponse<FlakyTest>> {
  const params = new URLSearchParams()
  params.append('page', String(page))
  params.append('page_size', String(pageSize))
  if (status) params.append('status', status)

  const response = await apiClient.get(`/tests/flaky/${repositoryId}?${params.toString()}`)
  return response.data
}

// Update flaky test status
export async function updateFlakyTestStatus(
  testId: string,
  status: 'active' | 'quarantined' | 'resolved'
): Promise<{ message: string }> {
  const response = await apiClient.patch(`/tests/flaky/${testId}/status?status=${status}`)
  return response.data
}

// Get coverage report
export async function getCoverageReport(
  repositoryId: string,
  commitSha?: string
): Promise<CoverageReport> {
  const params = commitSha ? `?commit_sha=${commitSha}` : ''
  const response = await apiClient.get(`/tests/coverage/${repositoryId}${params}`)
  return response.data
}

// Submit test results
export async function submitTestResults(data: {
  test_run_id: string
  tests: Array<{
    name: string
    status: 'passed' | 'failed' | 'skipped'
    duration_ms: number
    error_message?: string
  }>
}): Promise<TestRun> {
  const response = await apiClient.post('/tests/results', data)
  return response.data
}
