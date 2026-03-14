"use client"

import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

type PageTopbarProps = {
  backHref?: string
  backLabel?: string
}

export function PageTopbar({
  backHref,
  backLabel = "Back",
}: PageTopbarProps) {
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
            {backLabel}
          </Link>
        ) : (
          <div className="h-9" />
        )}
      </div>
    </div>
  )
}
