'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn, formatRelativeTime } from '@/lib/utils'
import { Search, Plus, MoreHorizontal, Mail, Shield, UserX } from 'lucide-react'

const users = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@company.com',
    role: 'org_admin',
    is_active: true,
    last_login: new Date(Date.now() - 2 * 3600000).toISOString(),
    avatar_url: null,
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@company.com',
    role: 'team_lead',
    is_active: true,
    last_login: new Date(Date.now() - 24 * 3600000).toISOString(),
    avatar_url: null,
  },
  {
    id: '3',
    name: 'Mike Johnson',
    email: 'mike@company.com',
    role: 'developer',
    is_active: true,
    last_login: new Date(Date.now() - 3 * 3600000).toISOString(),
    avatar_url: null,
  },
  {
    id: '4',
    name: 'Sarah Wilson',
    email: 'sarah@company.com',
    role: 'developer',
    is_active: true,
    last_login: new Date(Date.now() - 48 * 3600000).toISOString(),
    avatar_url: null,
  },
  {
    id: '5',
    name: 'Tom Brown',
    email: 'tom@company.com',
    role: 'viewer',
    is_active: false,
    last_login: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
    avatar_url: null,
  },
]

const roleColors: Record<string, string> = {
  platform_admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  org_admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  team_lead: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  developer: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  viewer: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-500',
}

const roleLabels: Record<string, string> = {
  platform_admin: 'Platform Admin',
  org_admin: 'Org Admin',
  team_lead: 'Team Lead',
  developer: 'Developer',
  viewer: 'Viewer',
}

export default function UsersPage() {
  const [search, setSearch] = useState('')

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
  )

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
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage user accounts and permissions
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Invite User
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">
                    Last Active
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-muted/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={cn(roleColors[user.role])}>
                        {roleLabels[user.role]}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={user.is_active ? 'success' : 'secondary'}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {formatRelativeTime(user.last_login)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Mail className="mr-2 h-4 w-4" />
                            Send Email
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Shield className="mr-2 h-4 w-4" />
                            Change Role
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <UserX className="mr-2 h-4 w-4" />
                            Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
