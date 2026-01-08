'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Building2,
  Globe,
  Bell,
  Shield,
  Key,
  Save,
  RefreshCw,
  Loader2,
  CheckCircle,
} from 'lucide-react'
import { admin } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'

interface OrganizationSettings {
  id: string
  name: string
  slug: string
  plan: string
  settings: {
    notifications?: {
      deployments?: boolean
      security?: boolean
      testFailures?: boolean
      weeklyReports?: boolean
    }
    security?: {
      mfaRequired?: boolean
      sessionTimeout?: string
      ipWhitelist?: boolean
      ssoEnabled?: boolean
    }
    webhooks?: {
      url?: string
      events?: string[]
    }
  }
  logo_url: string | null
  created_at: string
}

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const { accessToken } = useAuthStore()

  // Organization settings
  const [orgName, setOrgName] = useState('')
  const [orgSlug, setOrgSlug] = useState('')
  const [domain, setDomain] = useState('')

  // Notification settings
  const [notifications, setNotifications] = useState({
    deployments: true,
    security: true,
    testFailures: true,
    weeklyReports: false,
  })

  // Security settings
  const [security, setSecurity] = useState({
    mfaRequired: true,
    sessionTimeout: '8',
    ipWhitelist: false,
    ssoEnabled: true,
  })

  // Webhooks
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookEvents, setWebhookEvents] = useState<string[]>([])

  const fetchSettings = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await admin.getSettings()
      const data = response.data as OrganizationSettings

      setOrgName(data.name || '')
      setOrgSlug(data.slug || '')
      setDomain(data.settings?.webhooks?.url?.split('/')[2] || '')

      if (data.settings?.notifications) {
        setNotifications({
          deployments: data.settings.notifications.deployments ?? true,
          security: data.settings.notifications.security ?? true,
          testFailures: data.settings.notifications.testFailures ?? true,
          weeklyReports: data.settings.notifications.weeklyReports ?? false,
        })
      }

      if (data.settings?.security) {
        setSecurity({
          mfaRequired: data.settings.security.mfaRequired ?? true,
          sessionTimeout: data.settings.security.sessionTimeout ?? '8',
          ipWhitelist: data.settings.security.ipWhitelist ?? false,
          ssoEnabled: data.settings.security.ssoEnabled ?? true,
        })
      }

      if (data.settings?.webhooks) {
        setWebhookUrl(data.settings.webhooks.url || '')
        setWebhookEvents(data.settings.webhooks.events || [])
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err)
      setError('Failed to load settings. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (accessToken) {
      fetchSettings()
    }
  }, [accessToken])

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      await admin.updateSettings({
        name: orgName,
        slug: orgSlug,
        settings: {
          notifications,
          security,
          webhooks: {
            url: webhookUrl,
            events: webhookEvents,
          },
        },
      })
      setSuccessMessage('Settings saved successfully!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error('Failed to save settings:', err)
      setError('Failed to save settings. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const toggleWebhookEvent = (event: string) => {
    setWebhookEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    )
  }

  const availableWebhookEvents = [
    'deployment.created',
    'deployment.completed',
    'deployment.failed',
    'scan.completed',
    'test.failed',
    'vulnerability.detected',
  ]

  if (!accessToken) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please log in to view settings.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure organization-wide settings and preferences
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSettings} disabled={isLoading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Organization Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Organization</CardTitle>
            </div>
            <CardDescription>
              Basic organization information and branding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Organization Name</label>
              <Input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Your organization name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Organization Slug</label>
              <Input
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value)}
                placeholder="your-org"
              />
              <p className="text-xs text-muted-foreground">
                Used in URLs: app.zenpipeline.io/{orgSlug || 'your-org'}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Primary Domain</label>
              <Input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="yourcompany.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>
              Configure when and how you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'deployments', label: 'Deployment Events', desc: 'Get notified on deployment success/failure' },
              { key: 'security', label: 'Security Alerts', desc: 'Critical vulnerability notifications' },
              { key: 'testFailures', label: 'Test Failures', desc: 'Notify when tests fail in CI' },
              { key: 'weeklyReports', label: 'Weekly Reports', desc: 'Summary of weekly metrics' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <button
                  onClick={() =>
                    setNotifications((prev) => ({
                      ...prev,
                      [item.key]: !prev[item.key as keyof typeof prev],
                    }))
                  }
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    notifications[item.key as keyof typeof notifications]
                      ? 'bg-primary'
                      : 'bg-gray-200 dark:bg-gray-700'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      notifications[item.key as keyof typeof notifications]
                        ? 'translate-x-6'
                        : 'translate-x-1'
                    )}
                  />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Security</CardTitle>
            </div>
            <CardDescription>
              Authentication and access control settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Require MFA</p>
                <p className="text-xs text-muted-foreground">
                  All users must enable two-factor auth
                </p>
              </div>
              <button
                onClick={() =>
                  setSecurity((prev) => ({ ...prev, mfaRequired: !prev.mfaRequired }))
                }
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  security.mfaRequired ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    security.mfaRequired ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Session Timeout (hours)</label>
              <Input
                type="number"
                value={security.sessionTimeout}
                onChange={(e) =>
                  setSecurity((prev) => ({ ...prev, sessionTimeout: e.target.value }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">SSO Enabled</p>
                <p className="text-xs text-muted-foreground">
                  Allow single sign-on via SAML/OIDC
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={security.ssoEnabled ? 'success' : 'secondary'}>
                  {security.ssoEnabled ? 'Active' : 'Inactive'}
                </Badge>
                <button
                  onClick={() =>
                    setSecurity((prev) => ({ ...prev, ssoEnabled: !prev.ssoEnabled }))
                  }
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    security.ssoEnabled ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      security.ssoEnabled ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">IP Whitelist</p>
                <p className="text-xs text-muted-foreground">
                  Restrict access to specific IP ranges
                </p>
              </div>
              <button
                onClick={() =>
                  setSecurity((prev) => ({ ...prev, ipWhitelist: !prev.ipWhitelist }))
                }
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  security.ipWhitelist ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    security.ipWhitelist ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* API & Webhooks */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-muted-foreground" />
              <CardTitle>API & Webhooks</CardTitle>
            </div>
            <CardDescription>
              Manage API keys and webhook configurations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">API Key</label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value="zen_prod_xxxxxxxxxxxxxxxxxxxxxxxxxx"
                  readOnly
                  className="font-mono"
                />
                <Button variant="outline" size="icon">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use this key to authenticate API requests
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Webhook URL</label>
              <Input
                placeholder="https://your-server.com/webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
            </div>

            <div className="pt-2">
              <p className="text-sm font-medium mb-2">Webhook Events</p>
              <div className="flex flex-wrap gap-2">
                {availableWebhookEvents.map((event) => (
                  <Badge
                    key={event}
                    variant={webhookEvents.includes(event) ? 'default' : 'secondary'}
                    className="cursor-pointer"
                    onClick={() => toggleWebhookEvent(event)}
                  >
                    {event}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions that affect your entire organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Transfer Organization</p>
              <p className="text-sm text-muted-foreground">
                Transfer ownership to another admin user
              </p>
            </div>
            <Button variant="outline">Transfer</Button>
          </div>
          <div className="flex items-center justify-between p-4 border border-red-200 dark:border-red-900 rounded-lg">
            <div>
              <p className="font-medium text-red-600">Delete Organization</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete this organization and all data
              </p>
            </div>
            <Button variant="outline" className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-950">
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
