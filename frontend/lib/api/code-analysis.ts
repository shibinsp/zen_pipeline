import apiClient from './client'
import type {
  Repository,
  ScanResult,
  Vulnerability,
  PaginatedResponse,
  CreateRepositoryRequest,
  TriggerScanRequest,
  GitHubReviewResult,
} from '@/types'

// Fetch repositories for current user's organization
export async function getRepositories(
  search?: string,
  provider?: string,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResponse<Repository>> {
  const params = new URLSearchParams()
  params.append('page', String(page))
  params.append('page_size', String(pageSize))
  if (search) params.append('search', search)
  if (provider) params.append('provider', provider)

  const response = await apiClient.get(`/repositories?${params.toString()}`)
  return response.data
}

// Create a new repository
export async function createRepository(
  data: CreateRepositoryRequest
): Promise<Repository> {
  const response = await apiClient.post('/repositories', data)
  return response.data
}

// Trigger a new scan
export async function triggerScan(data: TriggerScanRequest): Promise<ScanResult> {
  const response = await apiClient.post('/analysis/scan', data)
  return response.data
}

// Get scan results
export async function getScans(
  repositoryId?: string,
  scanType?: string,
  status?: string,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResponse<ScanResult>> {
  const params = new URLSearchParams()
  params.append('page', String(page))
  params.append('page_size', String(pageSize))
  if (repositoryId) params.append('repository_id', repositoryId)
  if (scanType) params.append('scan_type', scanType)
  if (status) params.append('status', status)

  const response = await apiClient.get(`/analysis/scans?${params.toString()}`)
  return response.data
}

// Get vulnerabilities
export async function getVulnerabilities(
  repositoryId?: string,
  severity?: string,
  status?: string,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedResponse<Vulnerability>> {
  const params = new URLSearchParams()
  params.append('page', String(page))
  params.append('page_size', String(pageSize))
  if (repositoryId) params.append('repository_id', repositoryId)
  if (severity) params.append('severity', severity)
  if (status) params.append('status', status)

  const response = await apiClient.get(`/analysis/vulnerabilities?${params.toString()}`)
  return response.data
}

// Trigger GitHub code review for a repository
export async function reviewGitHubRepository(
  repositoryUrl: string,
  branch?: string
): Promise<GitHubReviewResult> {
  const response = await apiClient.post('/github/review', {
    repository_url: repositoryUrl,
    branch: branch || undefined,
  })
  return response.data
}

// Save review results to a repository
export async function saveReviewResults(
  repositoryId: string,
  reviewData: GitHubReviewResult
): Promise<Repository> {
  const response = await apiClient.put(`/repositories/${repositoryId}/review`, reviewData)
  return response.data
}

// Get a single repository by ID
export async function getRepository(repositoryId: string): Promise<Repository> {
  const response = await apiClient.get(`/repositories/${repositoryId}`)
  return response.data
}

// Helper function to parse repository URL and extract info
export function parseRepositoryUrl(url: string): {
  provider: string
  fullName: string
  name: string
} | null {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()
    const pathParts = urlObj.pathname.split('/').filter(Boolean)

    if (pathParts.length < 2) return null

    let provider = 'github'
    if (hostname.includes('gitlab')) {
      provider = 'gitlab'
    } else if (hostname.includes('bitbucket')) {
      provider = 'bitbucket'
    } else if (hostname.includes('azure') || hostname.includes('dev.azure')) {
      provider = 'azure_devops'
    }

    // Remove .git suffix if present
    const repoName = pathParts[pathParts.length - 1].replace(/\.git$/, '')
    const fullName = `${pathParts[pathParts.length - 2]}/${repoName}`

    return {
      provider,
      fullName,
      name: repoName,
    }
  } catch {
    return null
  }
}
