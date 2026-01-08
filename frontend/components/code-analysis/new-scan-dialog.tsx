'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Plus, Play, Loader2, Code } from 'lucide-react'
import type { Repository, GitHubReviewResult } from '@/types'
import {
  createRepository,
  parseRepositoryUrl,
  reviewGitHubRepository,
  saveReviewResults,
} from '@/lib/api/code-analysis'

interface NewScanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  repositories: Repository[]
  onSuccess: (reviewResult?: GitHubReviewResult) => void
  preSelectedRepo?: Repository | null
}

export function NewScanDialog({
  open,
  onOpenChange,
  repositories,
  onSuccess,
  preSelectedRepo,
}: NewScanDialogProps) {
  const [activeTab, setActiveTab] = useState('add')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  // Add Repository form state
  const [repoUrl, setRepoUrl] = useState('')
  const [repoName, setRepoName] = useState('')
  const [repoFullName, setRepoFullName] = useState('')
  const [repoProvider, setRepoProvider] = useState('github')

  // Scan Existing form state
  const [selectedRepoId, setSelectedRepoId] = useState('')

  // Parse URL and auto-fill fields
  useEffect(() => {
    if (repoUrl) {
      const parsed = parseRepositoryUrl(repoUrl)
      if (parsed) {
        setRepoName(parsed.name)
        setRepoFullName(parsed.fullName)
        setRepoProvider(parsed.provider)
      }
    }
  }, [repoUrl])

  // Handle pre-selected repo
  useEffect(() => {
    if (open && preSelectedRepo) {
      setActiveTab('existing')
      setSelectedRepoId(preSelectedRepo.id)
    }
  }, [open, preSelectedRepo])

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setRepoUrl('')
      setRepoName('')
      setRepoFullName('')
      setRepoProvider('github')
      setSelectedRepoId('')
      setError(null)
      setStatusMessage(null)
      setActiveTab('add')
    }
  }, [open])

  const handleAddAndScan = async () => {
    if (!repoUrl || !repoName || !repoFullName) {
      setError('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setStatusMessage('Creating repository...')

    try {
      // Create repository in database
      const newRepo = await createRepository({
        name: repoName,
        full_name: repoFullName,
        provider: repoProvider,
        url: repoUrl,
      })

      setStatusMessage('Analyzing repository (this may take a minute)...')

      // Run GitHub code review
      const reviewResult = await reviewGitHubRepository(repoUrl)

      // Save review results to the repository
      setStatusMessage('Saving analysis results...')
      await saveReviewResults(newRepo.id, reviewResult)

      setStatusMessage(null)
      onSuccess(reviewResult)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add repository and start analysis')
      setStatusMessage(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleScanExisting = async () => {
    if (!selectedRepoId) {
      setError('Please select a repository')
      return
    }

    const selectedRepo = repositories.find(r => r.id === selectedRepoId)
    if (!selectedRepo) {
      setError('Repository not found')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setStatusMessage('Analyzing repository (this may take a minute)...')

    try {
      // Run GitHub code review on existing repo
      const reviewResult = await reviewGitHubRepository(selectedRepo.url)

      // Save review results to the repository
      setStatusMessage('Saving analysis results...')
      await saveReviewResults(selectedRepoId, reviewResult)

      setStatusMessage(null)
      onSuccess(reviewResult)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start analysis')
      setStatusMessage(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>New Code Analysis</DialogTitle>
          <DialogDescription>
            Add a new repository or analyze an existing one
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="add" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Repository
            </TabsTrigger>
            <TabsTrigger value="existing" className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Analyze Existing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="add" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="repo-url">Repository URL *</Label>
              <Input
                id="repo-url"
                placeholder="https://github.com/username/repository"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter the GitHub/GitLab repository URL to analyze
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="repo-name">Repository Name</Label>
                <Input
                  id="repo-name"
                  placeholder="repository"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="provider">Provider</Label>
                <Select value={repoProvider} onValueChange={setRepoProvider}>
                  <SelectTrigger id="provider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="github">GitHub</SelectItem>
                    <SelectItem value="gitlab">GitLab</SelectItem>
                    <SelectItem value="bitbucket">Bitbucket</SelectItem>
                    <SelectItem value="azure_devops">Azure DevOps</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <Code className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-primary">Comprehensive Analysis</p>
                  <p className="text-muted-foreground mt-1">
                    Scans for security issues, code quality, complexity, documentation, and tech stack detection.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="existing" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="select-repo">Select Repository *</Label>
              <Select value={selectedRepoId} onValueChange={setSelectedRepoId}>
                <SelectTrigger id="select-repo">
                  <SelectValue placeholder="Choose a repository..." />
                </SelectTrigger>
                <SelectContent>
                  {repositories.length === 0 ? (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      No repositories found
                    </div>
                  ) : (
                    repositories.map((repo) => (
                      <SelectItem key={repo.id} value={repo.id}>
                        {repo.full_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted/50 p-3 rounded-lg mt-4">
              <div className="flex items-start gap-2">
                <Code className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-primary">Comprehensive Analysis</p>
                  <p className="text-muted-foreground mt-1">
                    Runs security, quality, and complexity analysis on the repository.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <p className="text-sm text-red-500 mt-2">{error}</p>
        )}

        {statusMessage && (
          <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 px-3 py-2 rounded-lg mt-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {statusMessage}
          </div>
        )}

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          {activeTab === 'add' ? (
            <Button onClick={handleAddAndScan} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add & Analyze
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleScanExisting} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Analysis
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
