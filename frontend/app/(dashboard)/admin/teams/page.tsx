'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Plus, Users, Settings } from 'lucide-react'

const teams = [
  {
    id: '1',
    name: 'Platform Team',
    description: 'Core platform infrastructure and DevOps',
    members: [
      { name: 'John Doe', role: 'lead' },
      { name: 'Jane Smith', role: 'member' },
      { name: 'Mike Johnson', role: 'member' },
    ],
    repos: ['api-service', 'infrastructure'],
  },
  {
    id: '2',
    name: 'Backend Team',
    description: 'Backend services and API development',
    members: [
      { name: 'Sarah Wilson', role: 'lead' },
      { name: 'Tom Brown', role: 'member' },
      { name: 'Lisa Chen', role: 'member' },
      { name: 'David Kim', role: 'member' },
    ],
    repos: ['user-service', 'payment-gateway', 'notification-service'],
  },
  {
    id: '3',
    name: 'Frontend Team',
    description: 'Web and mobile application development',
    members: [
      { name: 'Emily Davis', role: 'lead' },
      { name: 'Alex Turner', role: 'member' },
      { name: 'Chris Lee', role: 'member' },
    ],
    repos: ['frontend-app', 'mobile-app'],
  },
  {
    id: '4',
    name: 'Data Team',
    description: 'Data engineering and analytics',
    members: [
      { name: 'Rachel Green', role: 'lead' },
      { name: 'James Wilson', role: 'member' },
    ],
    repos: ['data-pipeline', 'analytics-dashboard'],
  },
]

export default function TeamsPage() {
  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
          <p className="text-muted-foreground">
            Organize teams and manage team access
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Team
        </Button>
      </div>

      {/* Teams Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {teams.map((team) => (
          <Card key={team.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-xl">{team.name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {team.description}
                </p>
              </div>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Members */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {team.members.length} Members
                    </span>
                  </div>
                  <div className="flex -space-x-2">
                    {team.members.slice(0, 5).map((member, i) => (
                      <Avatar key={i} className="border-2 border-background">
                        <AvatarFallback className="text-xs">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {team.members.length > 5 && (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
                        +{team.members.length - 5}
                      </div>
                    )}
                  </div>
                </div>

                {/* Repositories */}
                <div>
                  <p className="text-sm font-medium mb-2">Repositories</p>
                  <div className="flex flex-wrap gap-2">
                    {team.repos.map((repo) => (
                      <Badge key={repo} variant="secondary">
                        {repo}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    View Team
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    Manage Members
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
