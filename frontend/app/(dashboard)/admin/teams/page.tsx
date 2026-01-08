'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { Plus, Users, Settings, Loader2, RefreshCw, Trash2, UserPlus, MoreVertical, Pencil } from 'lucide-react'
import { admin } from '@/lib/api/endpoints'
import { useAuthStore } from '@/lib/stores/auth-store'

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  avatar_url?: string
}

interface Team {
  id: string
  name: string
  description: string | null
  members: TeamMember[]
  member_count: number
  repositories: string[]
  created_at: string
}

interface User {
  id: string
  name: string
  email: string
  role: string
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamDescription, setNewTeamDescription] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedMemberRole, setSelectedMemberRole] = useState('member')
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const { accessToken } = useAuthStore()

  const fetchTeams = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await admin.listTeams()
      setTeams(response.data.items || [])
    } catch (err) {
      console.error('Failed to fetch teams:', err)
      setError('Failed to load teams. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await admin.listUsers()
      setUsers(response.data.items || [])
    } catch (err) {
      console.error('Failed to fetch users:', err)
    }
  }

  useEffect(() => {
    if (accessToken) {
      fetchTeams()
      fetchUsers()
    }
  }, [accessToken])

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return

    setIsCreating(true)
    try {
      await admin.createTeam({
        name: newTeamName.trim(),
        description: newTeamDescription.trim() || undefined,
      })
      setIsCreateOpen(false)
      setNewTeamName('')
      setNewTeamDescription('')
      fetchTeams()
    } catch (err) {
      console.error('Failed to create team:', err)
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdateTeam = async () => {
    if (!selectedTeam || !newTeamName.trim()) return

    setIsUpdating(true)
    try {
      await admin.updateTeam(selectedTeam.id, {
        name: newTeamName.trim(),
        description: newTeamDescription.trim() || undefined,
      })
      setIsEditOpen(false)
      setSelectedTeam(null)
      setNewTeamName('')
      setNewTeamDescription('')
      fetchTeams()
    } catch (err) {
      console.error('Failed to update team:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`Are you sure you want to delete "${teamName}"? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(teamId)
    try {
      await admin.deleteTeam(teamId)
      fetchTeams()
    } catch (err) {
      console.error('Failed to delete team:', err)
    } finally {
      setIsDeleting(null)
    }
  }

  const handleAddMember = async () => {
    if (!selectedTeam || !selectedUserId) return

    setIsAddingMember(true)
    try {
      await admin.addTeamMember(selectedTeam.id, selectedUserId, selectedMemberRole)
      setIsAddMemberOpen(false)
      setSelectedUserId('')
      setSelectedMemberRole('member')
      fetchTeams()
    } catch (err) {
      console.error('Failed to add team member:', err)
    } finally {
      setIsAddingMember(false)
    }
  }

  const handleRemoveMember = async (teamId: string, userId: string) => {
    if (!confirm('Are you sure you want to remove this member from the team?')) {
      return
    }

    try {
      await admin.removeTeamMember(teamId, userId)
      fetchTeams()
    } catch (err) {
      console.error('Failed to remove team member:', err)
    }
  }

  const openEditDialog = (team: Team) => {
    setSelectedTeam(team)
    setNewTeamName(team.name)
    setNewTeamDescription(team.description || '')
    setIsEditOpen(true)
  }

  const openAddMemberDialog = (team: Team) => {
    setSelectedTeam(team)
    setIsAddMemberOpen(true)
  }

  const getInitials = (name: string) =>
    name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || '?'

  // Filter out users who are already team members
  const availableUsers = selectedTeam
    ? users.filter((user) => !selectedTeam.members.some((m) => m.id === user.id))
    : users

  if (!accessToken) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please log in to view teams.</p>
      </div>
    )
  }

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
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchTeams} disabled={isLoading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Team</DialogTitle>
                <DialogDescription>
                  Create a new team to organize your members.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Team Name</label>
                  <Input
                    placeholder="e.g., Platform Team"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    placeholder="Optional description"
                    value={newTeamDescription}
                    onChange={(e) => setNewTeamDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTeam} disabled={isCreating || !newTeamName.trim()}>
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Team
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && teams.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No teams yet</h3>
          <p className="text-muted-foreground mb-4">Create your first team to get started.</p>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Team
          </Button>
        </div>
      )}

      {/* Teams Grid */}
      {!isLoading && !error && teams.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {teams.map((team) => (
            <Card key={team.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-xl">{team.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {team.description || 'No description'}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={isDeleting === team.id}>
                      {isDeleting === team.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MoreVertical className="h-4 w-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditDialog(team)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit Team
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openAddMemberDialog(team)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Member
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => handleDeleteTeam(team.id, team.name)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Team
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Members */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {team.member_count || team.members.length} Members
                      </span>
                    </div>
                    {team.members.length > 0 ? (
                      <div className="flex -space-x-2">
                        {team.members.slice(0, 5).map((member) => (
                          <Avatar
                            key={member.id}
                            className="border-2 border-background cursor-pointer"
                            title={`${member.name} (${member.role})`}
                          >
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
                    ) : (
                      <p className="text-sm text-muted-foreground">No members yet</p>
                    )}
                  </div>

                  {/* Repositories */}
                  <div>
                    <p className="text-sm font-medium mb-2">Repositories</p>
                    <div className="flex flex-wrap gap-2">
                      {team.repositories.length > 0 ? (
                        team.repositories.map((repo) => (
                          <Badge key={repo} variant="secondary">
                            {repo}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No repositories</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openAddMemberDialog(team)}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Member
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEditDialog(team)}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Manage
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Team Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
            <DialogDescription>
              Update team details and manage members.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Team Name</label>
              <Input
                placeholder="e.g., Platform Team"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                placeholder="Optional description"
                value={newTeamDescription}
                onChange={(e) => setNewTeamDescription(e.target.value)}
              />
            </div>

            {/* Team Members List */}
            {selectedTeam && selectedTeam.members.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Members</label>
                <div className="border rounded-lg divide-y">
                  {selectedTeam.members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={member.role === 'lead' ? 'default' : 'secondary'}>
                          {member.role}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600"
                          onClick={() => handleRemoveMember(selectedTeam.id, member.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTeam} disabled={isUpdating || !newTeamName.trim()}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Add a member to {selectedTeam?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select User</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.length > 0 ? (
                    availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>
                      No available users
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={selectedMemberRole} onValueChange={setSelectedMemberRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMemberOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMember} disabled={isAddingMember || !selectedUserId}>
              {isAddingMember && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
