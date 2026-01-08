'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  Loader2,
  RefreshCw,
  Link,
  Unlink,
} from 'lucide-react'
import { admin } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'

interface IntegrationItem {
  id: string
  name: string
  type: string
  status: string
  connected_at?: string
  config: Record<string, unknown>
}

const integrationIcons: Record<string, React.ElementType> = {
  github: Github,
  gitlab: Gitlab,
  slack: Slack,
  jira: Trello,
  datadog: Activity,
  aws: Cloud,
}

const integrationCategories: Record<string, string> = {
  github: 'Source Control',
  gitlab: 'Source Control',
  slack: 'Communication',
  jira: 'Ticketing',
  datadog: 'Observability',
  aws: 'Cloud Provider',
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConfigureOpen, setIsConfigureOpen] = useState(false)
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationItem | null>(null)
  const [configValues, setConfigValues] = useState<Record<string, string>>({})
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState<string | null>(null)
  const { accessToken } = useAuthStore()

  const fetchIntegrations = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await admin.listIntegrations()
      setIntegrations((response.data.integrations || []) as IntegrationItem[])
    } catch (err) {
      console.error('Failed to fetch integrations:', err)
      setError('Failed to load integrations. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (accessToken) {
      fetchIntegrations()
    }
  }, [accessToken])

  const handleConnect = async () => {
    if (!selectedIntegration) return

    setIsConnecting(true)
    try {
      await admin.connectIntegration(selectedIntegration.id, configValues)
      setIsConfigureOpen(false)
      setSelectedIntegration(null)
      setConfigValues({})
      fetchIntegrations()
    } catch (err) {
      console.error('Failed to connect integration:', err)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async (integrationId: string) => {
    if (!confirm('Are you sure you want to disconnect this integration?')) {
      return
    }

    setIsDisconnecting(integrationId)
    try {
      await admin.disconnectIntegration(integrationId)
      fetchIntegrations()
    } catch (err) {
      console.error('Failed to disconnect integration:', err)
    } finally {
      setIsDisconnecting(null)
    }
  }

  const openConfigureDialog = (integration: IntegrationItem) => {
    setSelectedIntegration(integration)
    // Pre-fill config values if connected
    if (integration.status === 'connected' && integration.config) {
      const values: Record<string, string> = {}
      Object.entries(integration.config).forEach(([key, value]) => {
        values[key] = String(value)
      })
      setConfigValues(values)
    } else {
      setConfigValues({})
    }
    setIsConfigureOpen(true)
  }

  const getConfigFields = (integrationId: string): { key: string; label: string; placeholder: string }[] => {
    const fields: Record<string, { key: string; label: string; placeholder: string }[]> = {
      github: [
        { key: 'org', label: 'Organization', placeholder: 'Your GitHub organization' },
        { key: 'token', label: 'Access Token', placeholder: 'ghp_xxxxxxxxxxxx' },
      ],
      gitlab: [
        { key: 'group', label: 'Group', placeholder: 'Your GitLab group' },
        { key: 'token', label: 'Access Token', placeholder: 'glpat-xxxxxxxxxxxx' },
      ],
      slack: [
        { key: 'workspace', label: 'Workspace', placeholder: 'Your Slack workspace' },
        { key: 'channel', label: 'Channel', placeholder: '#deployments' },
        { key: 'webhook_url', label: 'Webhook URL', placeholder: 'https://hooks.slack.com/...' },
      ],
      jira: [
        { key: 'site', label: 'Site', placeholder: 'your-org.atlassian.net' },
        { key: 'project', label: 'Project Key', placeholder: 'ZEN' },
        { key: 'api_token', label: 'API Token', placeholder: 'Your Jira API token' },
      ],
      datadog: [
        { key: 'api_key', label: 'API Key', placeholder: 'Your Datadog API key' },
        { key: 'app_key', label: 'Application Key', placeholder: 'Your Datadog app key' },
        { key: 'site', label: 'Site', placeholder: 'datadoghq.com' },
      ],
      aws: [
        { key: 'region', label: 'Region', placeholder: 'us-east-1' },
        { key: 'access_key_id', label: 'Access Key ID', placeholder: 'AKIA...' },
        { key: 'secret_access_key', label: 'Secret Access Key', placeholder: 'Your secret key' },
      ],
    }
    return fields[integrationId] || []
  }

  const connectedCount = integrations.filter((i) => i.status === 'connected').length

  // Group integrations by category
  const categories = Array.from(new Set(integrations.map((i) => integrationCategories[i.id] || 'Other')))

  if (!accessToken) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please log in to view integrations.</p>
      </div>
    )
  }

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
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={fetchIntegrations} disabled={isLoading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Badge variant="success">{connectedCount} Connected</Badge>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Integrations by Category */}
      {!isLoading && !error && (
        <div className="space-y-6">
          {categories.map((category) => {
            const categoryIntegrations = integrations.filter(
              (i) => (integrationCategories[i.id] || 'Other') === category
            )
            if (categoryIntegrations.length === 0) return null

            return (
              <div key={category}>
                <h2 className="text-lg font-semibold mb-4">{category}</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {categoryIntegrations.map((integration) => {
                    const Icon = integrationIcons[integration.id] || Activity
                    return (
                      <Card key={integration.id}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-muted rounded-lg">
                              <Icon className="h-6 w-6" />
                            </div>
                            <div>
                              <CardTitle className="text-base">{integration.name}</CardTitle>
                              <p className="text-sm text-muted-foreground">
                                {integrationCategories[integration.id] || 'Integration'}
                              </p>
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
                                    <span className="font-medium">{String(value)}</span>
                                  </div>
                                ))}
                              </div>
                              {integration.connected_at && (
                                <div className="text-xs text-muted-foreground">
                                  Connected {formatDateTime(integration.connected_at)}
                                </div>
                              )}
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => openConfigureDialog(integration)}
                                >
                                  <Settings className="mr-2 h-4 w-4" />
                                  Configure
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600"
                                  onClick={() => handleDisconnect(integration.id)}
                                  disabled={isDisconnecting === integration.id}
                                >
                                  {isDisconnecting === integration.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Unlink className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <p className="text-sm text-muted-foreground">
                                Connect your {integration.name} account to enable integration
                                features.
                              </p>
                              <Button
                                className="w-full"
                                onClick={() => openConfigureDialog(integration)}
                              >
                                <Link className="mr-2 h-4 w-4" />
                                Connect {integration.name}
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Configure/Connect Dialog */}
      <Dialog open={isConfigureOpen} onOpenChange={setIsConfigureOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedIntegration?.status === 'connected' ? 'Configure' : 'Connect'}{' '}
              {selectedIntegration?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedIntegration?.status === 'connected'
                ? 'Update the configuration for this integration.'
                : 'Enter your credentials to connect this integration.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedIntegration &&
              getConfigFields(selectedIntegration.id).map((field) => (
                <div key={field.key} className="space-y-2">
                  <label className="text-sm font-medium">{field.label}</label>
                  <Input
                    type={field.key.includes('token') || field.key.includes('key') || field.key.includes('secret') ? 'password' : 'text'}
                    placeholder={field.placeholder}
                    value={configValues[field.key] || ''}
                    onChange={(e) =>
                      setConfigValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  />
                </div>
              ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfigureOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConnect} disabled={isConnecting}>
              {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedIntegration?.status === 'connected' ? 'Save Changes' : 'Connect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
