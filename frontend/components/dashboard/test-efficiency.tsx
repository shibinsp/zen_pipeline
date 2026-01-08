'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { analytics } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Loader2 } from 'lucide-react'

interface EfficiencyData {
  repo: string
  full: number
  selected: number
  saved: number
}

export function TestEfficiency() {
  const [data, setData] = useState<EfficiencyData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { accessToken } = useAuthStore()

  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken) {
        setIsLoading(false)
        return
      }

      try {
        const response = await analytics.getTestEfficiency(5)
        setData(response.data.data || [])
      } catch (error) {
        console.error('Failed to fetch test efficiency:', error)
        setData([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [accessToken])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Test Selection Efficiency</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[250px] flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 || (data.length === 1 && data[0].repo === 'No data') ? (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            No test data available
          </div>
        ) : (
          <>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    type="number"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    unit=" min"
                  />
                  <YAxis
                    type="category"
                    dataKey="repo"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string) => [
                      `${value} min`,
                      name === 'full' ? 'Full Suite' : 'Selected Tests',
                    ]}
                  />
                  <Bar dataKey="full" name="Full Suite" fill="#94a3b8" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="selected" name="Selected Tests" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-400" />
                <span className="text-sm text-muted-foreground">Full Suite</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-muted-foreground">ML Selected</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
