import apiClient from './client'
import type { PaginatedResponse } from '@/types'

export interface Deployment {
  id: string
  repository_id: string
  environment: string
  version: string
  commit_sha: string
  branch?: string
  risk_score: number
  risk_factors: Record<string, unknown>
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back'
  strategy: string
  deployed_by: string
  deployed_by_user?: {
    id: string
    email: string
    full_name: string
  }
  rollback_from?: string
  duration_seconds?: number
  impact_metrics: Record<string, unknown>
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
  confidence_level: string
  risk_level: string
  risk_factors: RiskFactor[]
  recommendations: string[]
  historical_success_rate?: number
}

export interface DeploymentMetric {
  id: string
  deployment_id: string
  metric_name: string
  metric_type: string
  before_value?: number
  after_value?: number
  change_percent?: number
  is_anomaly: string
  recorded_at: string
}

export interface DeploymentImpact {
  deployment_id: string
  metrics: DeploymentMetric[]
  anomalies_detected: number
  overall_impact: string
  business_impact?: Record<string, unknown>
}

export interface EnvironmentComparison {
  environment: string
  current_version: string
  last_deployment?: string
  status: string
  health_score: number
}

// Get all deployments
export async function getDeployments(
  repositoryId?: string,
  environment?: string,
  status?: string,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResponse<Deployment>> {
  const params = new URLSearchParams()
  params.append('page', String(page))
  params.append('page_size', String(pageSize))
  if (repositoryId) params.append('repository_id', repositoryId)
  if (environment) params.append('environment', environment)
  if (status) params.append('status', status)

  const response = await apiClient.get(`/deployments?${params.toString()}`)
  return response.data
}

// Create a new deployment
export async function createDeployment(data: {
  repository_id: string
  environment: string
  version: string
  commit_sha: string
  branch?: string
  strategy?: string
  notes?: string
}): Promise<Deployment> {
  const response = await apiClient.post('/deployments', data)
  return response.data
}

// Get a single deployment
export async function getDeployment(deploymentId: string): Promise<Deployment> {
  const response = await apiClient.get(`/deployments/${deploymentId}`)
  return response.data
}

// Rollback a deployment
export async function rollbackDeployment(
  deploymentId: string,
  reason?: string
): Promise<Deployment> {
  const response = await apiClient.post(`/deployments/${deploymentId}/rollback`, { reason })
  return response.data
}

// Complete a deployment (simulate completion)
export async function completeDeployment(deploymentId: string): Promise<Deployment> {
  const response = await apiClient.post(`/deployments/${deploymentId}/complete`)
  return response.data
}

// Get deployment impact metrics
export async function getDeploymentImpact(deploymentId: string): Promise<DeploymentImpact> {
  const response = await apiClient.get(`/deployments/${deploymentId}/impact`)
  return response.data
}

// Calculate risk score
export async function calculateRiskScore(data: {
  repository_id: string
  commit_sha: string
  environment: string
  changes?: Record<string, unknown>
}): Promise<RiskScoreResponse> {
  const response = await apiClient.post('/deployments/risk-score', data)
  return response.data
}

// Compare environments for a repository
export async function compareEnvironments(repositoryId: string): Promise<EnvironmentComparison[]> {
  const response = await apiClient.get(`/deployments/environments/compare?repository_id=${repositoryId}`)
  return response.data
}
