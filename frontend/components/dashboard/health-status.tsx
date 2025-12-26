'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react'

interface ServiceStatus {
  name: string
  status: 'healthy' | 'degraded' | 'down'
  latency?: string
}

const services: ServiceStatus[] = [
  { name: 'API Gateway', status: 'healthy', latency: '12ms' },
  { name: 'Code Analysis Engine', status: 'healthy', latency: '45ms' },
  { name: 'Test Intelligence', status: 'healthy', latency: '23ms' },
  { name: 'Deployment Service', status: 'healthy', latency: '18ms' },
  { name: 'ML Pipeline', status: 'degraded', latency: '156ms' },
  { name: 'Metrics Collector', status: 'healthy', latency: '8ms' },
]

const statusConfig = {
  healthy: {
    icon: CheckCircle2,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  degraded: {
    icon: AlertCircle,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
  },
  down: {
    icon: XCircle,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
  },
}

export function HealthStatus() {
  const healthyCount = services.filter((s) => s.status === 'healthy').length
  const overallStatus = healthyCount === services.length ? 'healthy' : 'degraded'

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">System Health</CardTitle>
        <div className="flex items-center gap-2">
          {overallStatus === 'healthy' ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-yellow-500" />
          )}
          <span className="text-sm font-medium capitalize">{overallStatus}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {services.map((service) => {
            const config = statusConfig[service.status]
            const Icon = config.icon

            return (
              <div
                key={service.name}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className={cn('p-1.5 rounded-md', config.bg)}>
                    <Icon className={cn('h-4 w-4', config.color)} />
                  </div>
                  <span className="text-sm font-medium">{service.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {service.latency}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
