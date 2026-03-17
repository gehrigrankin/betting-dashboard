"use client"

import * as React from "react"
import { PanelLeft } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type SidebarContextValue = {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

export function useSidebar() {
  const context = React.useContext(SidebarContext)

  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider")
  }

  return context
}

type SidebarProviderProps = {
  children: React.ReactNode
  defaultOpen?: boolean
}

export function SidebarProvider({
  children,
  defaultOpen = true,
}: SidebarProviderProps) {
  const [open, setOpen] = React.useState(defaultOpen)

  const toggleSidebar = React.useCallback(() => {
    setOpen((current) => !current)
  }, [])

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isShortcut =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b"

      if (!isShortcut) {
        return
      }

      event.preventDefault()
      toggleSidebar()
    }

    window.addEventListener("keydown", onKeyDown)

    return () => window.removeEventListener("keydown", onKeyDown)
  }, [toggleSidebar])

  return (
    <SidebarContext.Provider value={{ open, setOpen, toggleSidebar }}>
      <div className="flex min-h-screen bg-background text-foreground">
        {children}
      </div>
    </SidebarContext.Provider>
  )
}

type SidebarProps = {
  children: React.ReactNode
  className?: string
}

export function Sidebar({ children, className }: SidebarProps) {
  const { open } = useSidebar()

  return (
    <aside
      className={cn(
        "border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:flex md:flex-col",
        open
          ? "fixed inset-y-0 left-0 z-40 flex w-64 flex-col md:relative md:w-64"
          : "hidden md:flex md:w-[72px] md:flex-col",
        className
      )}
    >
      {children}
    </aside>
  )
}

export function SidebarHeader({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("border-b border-border p-4", className)}>{children}</div>
  )
}

export function SidebarContent({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("flex-1 overflow-y-auto p-3", className)}>{children}</div>
}

export function SidebarFooter({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("border-t border-border p-3", className)}>{children}</div>
  )
}

export function SidebarGroup({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <section className={cn("mb-4", className)}>{children}</section>
}

export function SidebarGroupLabel({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "px-2 pb-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground",
        className
      )}
    >
      {children}
    </div>
  )
}

export function SidebarMenu({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("space-y-1", className)}>{children}</div>
}

export function SidebarMenuItem({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn(className)}>{children}</div>
}

type SidebarMenuButtonProps = React.ComponentProps<"button"> & {
  isActive?: boolean
}

export function SidebarMenuButton({
  children,
  className,
  isActive,
  ...props
}: SidebarMenuButtonProps) {
  const { open } = useSidebar()

  return (
    <button
      className={cn(
        "flex w-full items-center gap-3 rounded-md border border-transparent px-3 py-2 text-left text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground",
        isActive && "bg-muted text-foreground",
        !open && "justify-center px-0",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function SidebarInset({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("flex min-h-screen flex-1 flex-col", className)}>{children}</div>
}

export function SidebarTrigger({
  className,
}: {
  className?: string
}) {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      aria-label="Toggle sidebar"
      className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }), className)}
      onClick={toggleSidebar}
      type="button"
    >
      <PanelLeft className="size-4" />
    </Button>
  )
}

/** Renders a backdrop on mobile when sidebar is open; clicking it closes the sidebar. */
export function SidebarOverlay() {
  const { open, setOpen } = useSidebar()

  if (!open) {
    return null
  }

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-30 bg-black/50 md:hidden"
      onClick={() => setOpen(false)}
      role="button"
      tabIndex={-1}
    />
  )
}
