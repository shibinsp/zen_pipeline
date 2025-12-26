'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn, formatDateTime } from '@/lib/utils'
import {
  Github,
  GitlabIcon as Gitlab,
  Slack,
  Trello,
  Activity,
  Cloud,
  CheckCircle2,
  XCircle,
  Settings,
} from 'lucide-react'

const integrations = [
  {
    id: 'github',
    name: 'GitHub',
    type: 'Source Control',
    icon: Github,
    status: 'connected',
    connected_at: '2024-01-15T10:30:00Z',
    config: { org: 'nxzen', repos: 12 },
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    type: 'Source Control',
    icon: Gitlab,
    status: 'disconnected',
    connected_at: null,
    config: {},
  },
  {
    id: 'slack',
    name: 'Slack',
    type: 'Communication',
    icon: Slack,
    status: 'connected',
    connected_at: '2024-01-10T08:00:00Z',
    config: { channel: '#deployments', workspace: 'NXZen' },
  },
  {
    id: 'jira',
    name: 'Jira',
    type: 'Ticketing',
    icon: Trello,
    status: 'connected',
    connected_at: '2024-01-12T14:20:00Z',
    config: { project: 'ZEN', site: 'nxzen.atlassian.net' },
  },
  {
    id: 'datadog',
    name: 'Datadog',
    type: 'Observability',
    icon: Activity,
    status: 'disconnected',
    connected_at: null,
    config: {},
  },
  {
    id: 'aws',
    name: 'AWS',
    type: 'Cloud Provider',
    icon: Cloud,
    status: 'connected',
    connected_at: '2024-01-08T09:15:00Z',
    config: { region: 'us-east-1', account: '****1234' },
  },
]

export default function IntegrationsPage() {
  const connectedCount = integrations.filter((i) => i.status === 'connected').length

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
          <p className="text-muted-foreground">
            Connect external services and tools to your pipeline
          </p>
        </div>
        <Badge variant="success">{connectedCount} Connected</Badge>
      </div>

      {/* Integrations by Category */}
      <div className="space-y-6">
        {['Source Control', 'Communication', 'Ticketing', 'Observability', 'Cloud Provider'].map(
          (category) => {
            const categoryIntegrations = integrations.filter((i) => i.type === category)
            if (categoryIntegrations.length === 0) return null

            return (
              <div key={category}>
                <h2 className="text-lg font-semibold mb-4">{category}</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {categoryIntegrations.map((integration) => (
                    <Card key={integration.id}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-muted rounded-lg">
                            <integration.icon className="h-6 w-6" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{integration.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">{integration.type}</p>
                          </div>
                        </div>
                        {integration.status === 'connected' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-gray-400" />
                        )}
                      </CardHeader>
                      <CardContent>
                        {integration.status === 'connected' ? (
                          <div className="space-y-3">
                            <div className="text-sm">
                              {Object.entries(integration.config).map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                  <span className="text-muted-foreground capitalize">
                                    {key.replace('_', ' ')}
                                  </span>
                                  <span className="font-medium">{value as string}</span>
                                </div>
                              ))}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Connected {formatDateTime(integration.connected_at!)}
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" className="flex-1">
                                <Settings className="mr-2 h-4 w-4" />
                                Configure
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-600">
                                Disconnect
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                              Connect your {integration.name} account to enable integration
                              features.
                            </p>
                            <Button className="w-full">Connect {integration.name}</Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          }
        )}
      </div>
    </div>
  )
}
