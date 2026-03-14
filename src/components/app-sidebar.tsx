"use client"

import Link from "next/link"
import { Home, LayoutDashboard, PanelTop, PlusSquare } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

function SidebarLink({
  href,
  label,
  icon: Icon,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}) {
  const { open } = useSidebar()

  return (
    <SidebarMenuItem>
      <Link
        href={href}
        className={cn(
          "flex w-full items-center gap-3 rounded-md border border-transparent px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground",
          !open && "justify-center px-0"
        )}
      >
        <Icon className="size-4 shrink-0" />
        {open ? <span>{label}</span> : null}
      </Link>
    </SidebarMenuItem>
  )
}

export function AppSidebar() {
  const { open } = useSidebar()

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-md border border-border bg-muted text-primary">
            <PanelTop className="size-4" />
          </div>
          {open ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                Betting Dashboards
              </p>
              <p className="text-xs text-muted-foreground">NBA research workspace</p>
            </div>
          ) : null}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{open ? "Navigation" : "Nav"}</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarLink href="/" icon={Home} label="Home" />
            <SidebarLink
              href="/dashboard"
              icon={LayoutDashboard}
              label="Dashboards"
            />
            <SidebarLink
              href="/dashboard/new"
              icon={PlusSquare}
              label="New dashboard"
            />
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="rounded-md border border-border bg-muted/50 px-3 py-2">
          {open ? (
            <>
              <p className="text-xs font-medium text-foreground">Auth setup pending</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Clerk can plug into this shell later.
              </p>
            </>
          ) : (
            <div className="mx-auto size-2 rounded-full bg-primary" />
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
