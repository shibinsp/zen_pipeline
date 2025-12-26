'use client'

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

const data = [
  { repo: 'api-service', full: 45, selected: 12, saved: 73 },
  { repo: 'frontend', full: 32, selected: 8, saved: 75 },
  { repo: 'user-service', full: 28, selected: 10, saved: 64 },
  { repo: 'payment', full: 22, selected: 6, saved: 73 },
  { repo: 'notification', full: 18, selected: 5, saved: 72 },
]

export function TestEfficiency() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Test Selection Efficiency</CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  )
}
