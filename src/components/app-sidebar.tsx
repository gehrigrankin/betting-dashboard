"use client"

import { ClerkLoaded, ClerkLoading, SignInButton, UserButton, useAuth } from "@clerk/nextjs"
import Link from "next/link"
import { usePathname } from "next/navigation"
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
import { buttonVariants } from "@/components/ui/button"
import { isClerkConfigured } from "@/lib/clerk"
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
  const pathname = usePathname()
  const isActive = href === "/" ? pathname === href : pathname.startsWith(href)

  return (
    <SidebarMenuItem>
      <Link
        href={href}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition backdrop-blur-sm",
          isActive
            ? "border-primary/15 bg-white/[0.03] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_0_0_1px_rgba(130,164,255,0.18),0_0_28px_rgba(124,154,255,0.12),0_10px_30px_rgba(0,0,0,0.18)]"
            : "border-transparent text-muted-foreground hover:border-white/8 hover:bg-white/5 hover:text-foreground",
          !open && "justify-center px-0"
        )}
      >
        <Icon className={cn("size-4 shrink-0", isActive && "text-primary")} />
        {open ? <span>{label}</span> : null}
      </Link>
    </SidebarMenuItem>
  )
}

export function AppSidebar() {
  const { open } = useSidebar()

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-white/8">
        <div className="glass-panel flex items-center gap-3 rounded-2xl p-3">
          <div className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/6 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <PanelTop className="size-4" />
          </div>
          {open ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-foreground">
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
        {isClerkConfigured ? (
          <SidebarAuthStatus open={open} />
        ) : (
          <div className="glass-panel rounded-xl px-3 py-2.5">
            {open ? (
              <>
                <p className="text-xs font-medium text-foreground">Auth setup pending</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add real Clerk keys to enable personal dashboards.
                </p>
              </>
            ) : (
              <div className="mx-auto size-2 rounded-full bg-primary" />
            )}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}

function SidebarAuthStatus({ open }: { open: boolean }) {
  const { userId } = useAuth()

  return (
    <div className="glass-panel rounded-xl px-3 py-2.5">
      <ClerkLoading>
        <div className={cn("h-8", !open && "h-6")} />
      </ClerkLoading>

      <ClerkLoaded>
        {userId ? (
          <div className={cn("flex items-center gap-3", !open && "justify-center")}>
            <UserButton />
            {open ? (
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">Signed in</p>
                <p className="text-xs text-muted-foreground">
                  Your dashboards sync to your account.
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <SignInButton forceRedirectUrl="/dashboard">
            <button
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
              type="button"
            >
              Sign in
            </button>
          </SignInButton>
        )}
      </ClerkLoaded>
    </div>
  )
}
