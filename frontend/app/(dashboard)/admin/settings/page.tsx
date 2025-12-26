'use client'

import { useState } from 'react'
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
} from 'lucide-react'

export default function SettingsPage() {
  const [orgName, setOrgName] = useState('NXZen Technologies')
  const [orgSlug, setOrgSlug] = useState('nxzen')
  const [domain, setDomain] = useState('nxzen.io')

  const [notifications, setNotifications] = useState({
    deployments: true,
    security: true,
    testFailures: true,
    weeklyReports: false,
  })

  const [security, setSecurity] = useState({
    mfaRequired: true,
    sessionTimeout: '8',
    ipWhitelist: false,
    ssoEnabled: true,
  })

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
        <Button>
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>

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
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Organization Slug</label>
              <Input
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Used in URLs: app.zenpipeline.io/{orgSlug}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Primary Domain</label>
              <Input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
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
                <Badge variant="success">Active</Badge>
                <Button variant="outline" size="sm">
                  Configure
                </Button>
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
                defaultValue="https://api.nxzen.io/webhooks/pipeline"
              />
            </div>

            <div className="pt-2">
              <p className="text-sm font-medium mb-2">Webhook Events</p>
              <div className="flex flex-wrap gap-2">
                {['deployment.created', 'deployment.completed', 'scan.completed', 'test.failed'].map(
                  (event) => (
                    <Badge key={event} variant="secondary">
                      {event}
                    </Badge>
                  )
                )}
                <Button variant="outline" size="sm">
                  + Add Event
                </Button>
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
