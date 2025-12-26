'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Building2, PlugZap, ScrollText, Settings, CreditCard } from 'lucide-react'

const adminSections = [
  {
    title: 'User Management',
    description: 'Manage users, roles, and permissions',
    icon: Users,
    href: '/admin/users',
    stats: '24 users',
  },
  {
    title: 'Teams',
    description: 'Organize teams and set team policies',
    icon: Building2,
    href: '/admin/teams',
    stats: '5 teams',
  },
  {
    title: 'Integrations',
    description: 'Connect external services and tools',
    icon: PlugZap,
    href: '/admin/integrations',
    stats: '4 connected',
  },
  {
    title: 'Audit Logs',
    description: 'View activity and security logs',
    icon: ScrollText,
    href: '/admin/audit-logs',
    stats: '1,234 events',
  },
  {
    title: 'Settings',
    description: 'Configure organization settings',
    icon: Settings,
    href: '/admin/settings',
    stats: '',
  },
  {
    title: 'Billing & Usage',
    description: 'Manage subscription and view usage',
    icon: CreditCard,
    href: '/admin/billing',
    stats: 'Enterprise Plan',
  },
]

export default function AdminPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Administration</h1>
        <p className="text-muted-foreground">
          Manage your organization, users, and platform settings
        </p>
      </div>

      {/* Admin Sections Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {adminSections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">
                  {section.title}
                </CardTitle>
                <section.icon className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {section.description}
                </p>
                {section.stats && (
                  <p className="text-sm font-medium text-primary">
                    {section.stats}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">24</p>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">5</p>
              <p className="text-sm text-muted-foreground">Teams</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">12</p>
              <p className="text-sm text-muted-foreground">Repositories</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">4</p>
              <p className="text-sm text-muted-foreground">Integrations</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
