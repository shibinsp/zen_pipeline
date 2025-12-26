'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
} from 'lucide-react'

const auditLogs = [
  {
    id: '1',
    action: 'login',
    user: 'john@company.com',
    resource_type: 'user',
    details: { method: 'password' },
    ip_address: '192.168.1.100',
    status: 'success',
    created_at: new Date(Date.now() - 15 * 60000).toISOString(),
  },
  {
    id: '2',
    action: 'deploy',
    user: 'jane@company.com',
    resource_type: 'deployment',
    details: { repo: 'api-service', env: 'production', version: 'v2.4.1' },
    ip_address: '192.168.1.101',
    status: 'success',
    created_at: new Date(Date.now() - 45 * 60000).toISOString(),
  },
  {
    id: '3',
    action: 'update',
    user: 'john@company.com',
    resource_type: 'settings',
    details: { setting: 'notification_preferences' },
    ip_address: '192.168.1.100',
    status: 'success',
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: '4',
    action: 'rollback',
    user: 'mike@company.com',
    resource_type: 'deployment',
    details: { repo: 'payment-gateway', from: 'v3.1.0', to: 'v3.0.5' },
    ip_address: '192.168.1.102',
    status: 'success',
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    id: '5',
    action: 'create',
    user: 'john@company.com',
    resource_type: 'user',
    details: { new_user: 'newdev@company.com', role: 'developer' },
    ip_address: '192.168.1.100',
    status: 'success',
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
  {
    id: '6',
    action: 'login',
    user: 'unknown@external.com',
    resource_type: 'user',
    details: { method: 'password', reason: 'Invalid credentials' },
    ip_address: '203.45.67.89',
    status: 'failed',
    created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
  },
]

const actionIcons: Record<string, React.ElementType> = {
  login: LogIn,
  logout: LogOut,
  deploy: Rocket,
  rollback: RotateCcw,
  create: UserPlus,
  update: Settings,
}

const actionColors: Record<string, string> = {
  login: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  logout: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  deploy: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rollback: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  create: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  update: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
}

export default function AuditLogsPage() {
  const [search, setSearch] = useState('')

  const filteredLogs = auditLogs.filter(
    (log) =>
      log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.resource_type.toLowerCase().includes(search.toLowerCase())
  )

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
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Logs List */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {filteredLogs.map((log) => {
              const Icon = actionIcons[log.action] || Shield
              return (
                <div key={log.id} className="p-4 hover:bg-muted/50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={cn('p-2 rounded-lg', actionColors[log.action])}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">{log.action}</span>
                          <Badge variant="outline">{log.resource_type}</Badge>
                          <Badge
                            variant={log.status === 'success' ? 'success' : 'error'}
                          >
                            {log.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {log.user}
                        </p>
                        {Object.entries(log.details).length > 0 && (
                          <div className="text-sm text-muted-foreground mt-2">
                            {Object.entries(log.details).map(([key, value]) => (
                              <span key={key} className="mr-3">
                                <span className="capitalize">{key.replace('_', ' ')}</span>:{' '}
                                <span className="font-medium">{value as string}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">{formatDateTime(log.created_at)}</p>
                      <p className="text-xs text-muted-foreground">{log.ip_address}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
