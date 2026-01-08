'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn, formatDateTime } from '@/lib/utils'
import {
  Search,
  Filter,
  Download,
  LogIn,
  LogOut,
  Settings,
  Rocket,
  RotateCcw,
  UserPlus,
  Shield,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Eye,
  Edit,
  AlertTriangle,
} from 'lucide-react'
import { admin } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'

interface AuditLogItem {
  id: string
  user_id?: string
  action: string
  resource_type: string
  resource_id?: string
  details?: Record<string, unknown>
  ip_address?: string
  status: string
  created_at: string
}

const actionIcons: Record<string, React.ElementType> = {
  login: LogIn,
  LOGIN: LogIn,
  logout: LogOut,
  LOGOUT: LogOut,
  deploy: Rocket,
  DEPLOY: Rocket,
  rollback: RotateCcw,
  ROLLBACK: RotateCcw,
  create: UserPlus,
  CREATE: UserPlus,
  update: Edit,
  UPDATE: Edit,
  delete: Trash2,
  DELETE: Trash2,
  read: Eye,
  READ: Eye,
  scan: Shield,
  SCAN: Shield,
  approve: Shield,
  APPROVE: Shield,
  reject: AlertTriangle,
  REJECT: AlertTriangle,
}

const actionColors: Record<string, string> = {
  login: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  LOGIN: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  logout: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  LOGOUT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  deploy: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  DEPLOY: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rollback: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  ROLLBACK: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  create: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  CREATE: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  update: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  UPDATE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  read: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  READ: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  scan: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  SCAN: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  approve: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  APPROVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  reject: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  REJECT: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

const resourceTypes = [
  { value: 'all', label: 'All Resources' },
  { value: 'USER', label: 'User' },
  { value: 'ORGANIZATION', label: 'Organization' },
  { value: 'TEAM', label: 'Team' },
  { value: 'REPOSITORY', label: 'Repository' },
  { value: 'DEPLOYMENT', label: 'Deployment' },
  { value: 'SCAN', label: 'Scan' },
  { value: 'SETTINGS', label: 'Settings' },
  { value: 'INTEGRATION', label: 'Integration' },
]

const actions = [
  { value: 'all', label: 'All Actions' },
  { value: 'CREATE', label: 'Create' },
  { value: 'READ', label: 'Read' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'LOGOUT', label: 'Logout' },
  { value: 'DEPLOY', label: 'Deploy' },
  { value: 'ROLLBACK', label: 'Rollback' },
  { value: 'SCAN', label: 'Scan' },
  { value: 'APPROVE', label: 'Approve' },
  { value: 'REJECT', label: 'Reject' },
]

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [resourceFilter, setResourceFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const { accessToken } = useAuthStore()

  const fetchLogs = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params: Record<string, string | number> = { page, page_size: 20 }
      if (actionFilter && actionFilter !== 'all') params.action = actionFilter
      if (resourceFilter && resourceFilter !== 'all') params.resource_type = resourceFilter

      const response = await admin.getAuditLogs(params as any)
      setLogs((response.data.items || []) as AuditLogItem[])
      setTotalPages(response.data.total_pages || 1)
      setTotal(response.data.total || 0)
    } catch (err: any) {
      console.error('Failed to fetch audit logs:', err)
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        setError('You do not have permission to view audit logs. Admin access required.')
      } else {
        setError('Failed to load audit logs. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (accessToken) {
      fetchLogs()
    }
  }, [accessToken, page, actionFilter, resourceFilter])

  const handleExport = () => {
    // Create CSV content
    const headers = ['Timestamp', 'Action', 'Resource Type', 'Status', 'IP Address', 'Details']
    const rows = logs.map((log) => [
      log.created_at,
      log.action,
      log.resource_type,
      log.status,
      log.ip_address ?? '',
      JSON.stringify(log.details ?? {}),
    ])

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Filter logs by search term (client-side)
  const filteredLogs = logs.filter((log) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      log.action.toLowerCase().includes(searchLower) ||
      log.resource_type.toLowerCase().includes(searchLower) ||
      (log.details ? JSON.stringify(log.details).toLowerCase().includes(searchLower) : false)
    )
  })

  if (!accessToken) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please log in to view audit logs.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground">
            View activity and security logs
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchLogs} disabled={isLoading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={logs.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={actionFilter || 'all'} onValueChange={(value) => { setActionFilter(value || 'all'); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            {actions.map((action) => (
              <SelectItem key={action.value} value={action.value || 'all'}>
                {action.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={resourceFilter || 'all'} onValueChange={(value) => { setResourceFilter(value || 'all'); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by resource" />
          </SelectTrigger>
          <SelectContent>
            {resourceTypes.map((resource) => (
              <SelectItem key={resource.value} value={resource.value || 'all'}>
                {resource.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-3">
          <Shield className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">{error}</p>
            {error.includes('permission') && (
              <p className="text-sm text-red-500 dark:text-red-400/80 mt-1">
                Contact your administrator to request access to audit logs.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredLogs.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Shield className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No audit logs found</h3>
          <p className="text-muted-foreground">
            {search || actionFilter !== 'all' || resourceFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Audit logs will appear here as actions are performed'}
          </p>
        </div>
      )}

      {/* Logs List */}
      {!isLoading && !error && filteredLogs.length > 0 && (
        <>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredLogs.map((log) => {
                  const Icon = actionIcons[log.action] || Shield
                  return (
                    <div key={log.id} className="p-4 hover:bg-muted/50">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className={cn('p-2 rounded-lg', actionColors[log.action] || 'bg-gray-100')}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium capitalize">
                                {log.action.toLowerCase().replace('_', ' ')}
                              </span>
                              <Badge variant="outline">{log.resource_type.toLowerCase()}</Badge>
                              <Badge
                                variant={log.status === 'success' ? 'success' : 'error'}
                              >
                                {log.status}
                              </Badge>
                            </div>
                            {log.user_id && (
                              <p className="text-sm text-muted-foreground mt-1">
                                User ID: {log.user_id}
                              </p>
                            )}
                            {log.details && typeof log.details === 'object' && Object.keys(log.details).length > 0 && (
                              <div className="text-sm text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1">
                                {Object.entries(log.details).map(([key, value]) => (
                                  <span key={key}>
                                    <span className="capitalize">{key.replace('_', ' ')}</span>:{' '}
                                    <span className="font-medium">
                                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">{formatDateTime(log.created_at)}</p>
                          {log.ip_address && (
                            <p className="text-xs text-muted-foreground">{log.ip_address}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {filteredLogs.length} of {total} logs
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
