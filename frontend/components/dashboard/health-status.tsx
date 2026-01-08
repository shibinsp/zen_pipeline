'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { CheckCircle2, AlertCircle, XCircle, Loader2 } from 'lucide-react'
import { analytics } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'

interface ServiceStatus {
  name: string
  status: 'healthy' | 'degraded' | 'down'
  latency?: string
}

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
  const [services, setServices] = useState<ServiceStatus[]>([])
  const [overallStatus, setOverallStatus] = useState<'healthy' | 'degraded' | 'down'>('healthy')
  const [isLoading, setIsLoading] = useState(true)
  const { accessToken } = useAuthStore()

  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken) {
        setIsLoading(false)
        return
      }

      try {
        const response = await analytics.getHealthStatus()
        setServices(response.data.services || [])
        setOverallStatus(response.data.overall_status || 'healthy')
      } catch (error) {
        console.error('Failed to fetch health status:', error)
        setServices([])
        setOverallStatus('degraded')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [accessToken])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">System Health</CardTitle>
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <div className="flex items-center gap-2">
            {overallStatus === 'healthy' ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : overallStatus === 'degraded' ? (
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <span className="text-sm font-medium capitalize">{overallStatus}</span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : services.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            No services to display
          </div>
        ) : (
          <div className="space-y-3">
            {services.map((service) => {
              const config = statusConfig[service.status] || statusConfig.healthy
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
        )}
      </CardContent>
    </Card>
  )
}
