'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  CreditCard,
  Download,
  CheckCircle2,
  Zap,
  Users,
  HardDrive,
  Activity,
  ArrowUpRight,
} from 'lucide-react'

const currentPlan = {
  name: 'Enterprise',
  price: '$499',
  period: 'month',
  features: [
    'Unlimited repositories',
    'Unlimited users',
    'Priority support',
    'Custom integrations',
    'SLA guarantee',
    'Dedicated account manager',
  ],
}

const usage = {
  repositories: { current: 12, limit: null, label: 'Repositories' },
  users: { current: 24, limit: null, label: 'Users' },
  storage: { current: 45.2, limit: 100, label: 'Storage (GB)' },
  apiCalls: { current: 125000, limit: 500000, label: 'API Calls' },
  deployments: { current: 342, limit: null, label: 'Deployments this month' },
  scans: { current: 1250, limit: null, label: 'Code scans this month' },
}

const invoices = [
  { id: 'INV-2024-001', date: '2024-01-01', amount: '$499.00', status: 'paid' },
  { id: 'INV-2023-012', date: '2023-12-01', amount: '$499.00', status: 'paid' },
  { id: 'INV-2023-011', date: '2023-11-01', amount: '$499.00', status: 'paid' },
  { id: 'INV-2023-010', date: '2023-10-01', amount: '$499.00', status: 'paid' },
  { id: 'INV-2023-009', date: '2023-09-01', amount: '$499.00', status: 'paid' },
]

const plans = [
  {
    name: 'Starter',
    price: '$49',
    description: 'For small teams getting started',
    features: ['5 repositories', '10 users', 'Email support', 'Basic integrations'],
  },
  {
    name: 'Professional',
    price: '$199',
    description: 'For growing engineering teams',
    features: ['25 repositories', '50 users', 'Priority support', 'Advanced integrations', 'API access'],
  },
  {
    name: 'Enterprise',
    price: '$499',
    description: 'For large organizations',
    features: ['Unlimited repositories', 'Unlimited users', 'Dedicated support', 'Custom integrations', 'SLA guarantee'],
    current: true,
  },
]

export default function BillingPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing & Usage</h1>
          <p className="text-muted-foreground">
            Manage your subscription and view usage metrics
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Download Invoices
        </Button>
      </div>

      {/* Current Plan */}
      <Card className="border-primary">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">
                  {currentPlan.name} Plan
                  <Badge variant="success" className="ml-2">Active</Badge>
                </CardTitle>
                <CardDescription>
                  Billed monthly · Next invoice on Feb 1, 2024
                </CardDescription>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{currentPlan.price}</p>
              <p className="text-sm text-muted-foreground">per {currentPlan.period}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {currentPlan.features.map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-6">
            <Button variant="outline">Change Plan</Button>
            <Button variant="outline">Update Payment Method</Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage Stats */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Current Usage</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(usage).map(([key, data]) => (
            <Card key={key}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{data.label}</span>
                  {key === 'repositories' && <HardDrive className="h-4 w-4 text-muted-foreground" />}
                  {key === 'users' && <Users className="h-4 w-4 text-muted-foreground" />}
                  {key === 'apiCalls' && <Activity className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">
                    {typeof data.current === 'number' && data.current > 1000
                      ? `${(data.current / 1000).toFixed(0)}k`
                      : data.current}
                  </span>
                  {data.limit && (
                    <span className="text-sm text-muted-foreground">
                      / {data.limit > 1000 ? `${data.limit / 1000}k` : data.limit}
                    </span>
                  )}
                  {!data.limit && (
                    <span className="text-sm text-muted-foreground">unlimited</span>
                  )}
                </div>
                {data.limit && (
                  <Progress
                    value={(data.current / data.limit) * 100}
                    className="mt-3"
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Payment Method</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-muted rounded">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium">•••• •••• •••• 4242</p>
                <p className="text-sm text-muted-foreground">Expires 12/2025</p>
              </div>
            </div>
            <Badge variant="secondary">Default</Badge>
          </div>
          <Button variant="outline" className="mt-4">
            Add Payment Method
          </Button>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>Download past invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Invoice
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{invoice.id}</td>
                    <td className="px-4 py-3 text-muted-foreground">{invoice.date}</td>
                    <td className="px-4 py-3">{invoice.amount}</td>
                    <td className="px-4 py-3">
                      <Badge variant="success" className="capitalize">
                        {invoice.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Compare Plans */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Compare Plans</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.name} className={plan.current ? 'border-primary' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.name}</CardTitle>
                  {plan.current && <Badge>Current</Badge>}
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.current ? 'outline' : 'default'}
                  disabled={plan.current}
                >
                  {plan.current ? 'Current Plan' : 'Upgrade'}
                  {!plan.current && <ArrowUpRight className="ml-2 h-4 w-4" />}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
