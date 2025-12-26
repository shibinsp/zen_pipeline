'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/lib/stores/ui-store'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  LayoutDashboard,
  Code,
  TestTube2,
  Rocket,
  Network,
  BarChart3,
  Settings,
  Users,
  Building2,
  PlugZap,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react'

const mainNavItems = [
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Code Analysis',
    href: '/code-analysis',
    icon: Code,
  },
  {
    title: 'Testing',
    href: '/testing',
    icon: TestTube2,
  },
  {
    title: 'Deployments',
    href: '/deployments',
    icon: Rocket,
  },
  {
    title: 'Architecture',
    href: '/architecture',
    icon: Network,
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
  },
]

const adminNavItems = [
  {
    title: 'Users',
    href: '/admin/users',
    icon: Users,
  },
  {
    title: 'Teams',
    href: '/admin/teams',
    icon: Building2,
  },
  {
    title: 'Integrations',
    href: '/admin/integrations',
    icon: PlugZap,
  },
  {
    title: 'Audit Logs',
    href: '/admin/audit-logs',
    icon: ScrollText,
  },
  {
    title: 'Settings',
    href: '/admin/settings',
    icon: Settings,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarCollapsed, toggleSidebar } = useUIStore()

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen border-r bg-card transition-all duration-300',
          sidebarCollapsed ? 'w-16' : 'w-64'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b px-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
              {!sidebarCollapsed && (
                <div className="flex flex-col">
                  <span className="text-lg font-bold">zen Pipeline</span>
                  <span className="text-xs text-muted-foreground">AI</span>
                </div>
              )}
            </Link>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 py-4">
            <nav className="space-y-1 px-2">
              {mainNavItems.map((item) => {
                const isActive = pathname === item.href
                const NavItem = (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                      sidebarCollapsed && 'justify-center px-2'
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!sidebarCollapsed && <span>{item.title}</span>}
                  </Link>
                )

                if (sidebarCollapsed) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>{NavItem}</TooltipTrigger>
                      <TooltipContent side="right">
                        {item.title}
                      </TooltipContent>
                    </Tooltip>
                  )
                }

                return NavItem
              })}
            </nav>

            <Separator className="my-4" />

            {/* Admin Section */}
            {!sidebarCollapsed && (
              <div className="px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Administration
                </span>
              </div>
            )}
            <nav className="space-y-1 px-2">
              {adminNavItems.map((item) => {
                const isActive = pathname === item.href
                const NavItem = (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                      sidebarCollapsed && 'justify-center px-2'
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!sidebarCollapsed && <span>{item.title}</span>}
                  </Link>
                )

                if (sidebarCollapsed) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>{NavItem}</TooltipTrigger>
                      <TooltipContent side="right">
                        {item.title}
                      </TooltipContent>
                    </Tooltip>
                  )
                }

                return NavItem
              })}
            </nav>
          </ScrollArea>

          {/* Collapse Button */}
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center"
              onClick={toggleSidebar}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  <span>Collapse</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}
