"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

type PageTopbarProps = {
  backHref?: string
  backLabel?: string
}

export function PageTopbar({
  backHref: backHrefProp,
  backLabel = "Back",
}: PageTopbarProps) {
  const pathname = usePathname()

  // When on /dashboard/[id]/edit, show "Back to board" → /dashboard/[id]
  const editMatch = pathname?.match(/^\/dashboard\/([^/]+)\/edit$/)
  const backHref = editMatch
    ? `/dashboard/${editMatch[1]}`
    : backHrefProp
  const backLabelResolved = editMatch ? "Back to board" : backLabel

  return (
    <div className="px-6 py-3">
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        {backHref ? (
          <Link
            href={backHref}
            className={buttonVariants({
              variant: "ghost",
              size: "lg",
              className: "justify-start gap-2 px-0 hover:bg-transparent",
            })}
          >
            <ChevronLeft className="size-4" />
            {backLabelResolved}
          </Link>
        ) : (
          <div className="h-9" />
        )}
      </div>
    </div>
  )
}
