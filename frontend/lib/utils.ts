import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  })
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = now.getTime() - d.getTime()

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 7) {
    return formatDate(d)
  } else if (days > 0) {
    return `${days}d ago`
  } else if (hours > 0) {
    return `${hours}h ago`
  } else if (minutes > 0) {
    return `${minutes}m ago`
  } else {
    return 'Just now'
  }
}

export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  }
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) {
    return `${seconds}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function getSeverityColor(severity: string): string {
  switch (severity.toLowerCase()) {
    case 'critical':
      return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30'
    case 'high':
      return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30'
    case 'medium':
      return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30'
    case 'low':
      return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30'
    default:
      return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30'
  }
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'success':
    case 'healthy':
    case 'resolved':
      return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30'
    case 'in_progress':
    case 'running':
    case 'pending':
      return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30'
    case 'failed':
    case 'error':
    case 'critical':
      return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30'
    case 'rolled_back':
    case 'warning':
      return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30'
    default:
      return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30'
  }
}

export function getRiskColor(score: number): string {
  if (score >= 80) {
    return 'text-red-600'
  } else if (score >= 60) {
    return 'text-orange-600'
  } else if (score >= 40) {
    return 'text-yellow-600'
  } else {
    return 'text-green-600'
  }
}

export function getHealthScoreColor(score: string): string {
  switch (score.toUpperCase()) {
    case 'A':
      return 'text-green-600 bg-green-100'
    case 'B':
      return 'text-blue-600 bg-blue-100'
    case 'C':
      return 'text-yellow-600 bg-yellow-100'
    case 'D':
      return 'text-orange-600 bg-orange-100'
    case 'F':
      return 'text-red-600 bg-red-100'
    default:
      return 'text-gray-600 bg-gray-100'
  }
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function getProviderIcon(provider: string): string {
  switch (provider.toLowerCase()) {
    case 'github':
      return 'Github'
    case 'gitlab':
      return 'Gitlab'
    case 'bitbucket':
      return 'GitBranch'
    case 'azure_devops':
      return 'Cloud'
    default:
      return 'GitBranch'
  }
}
