"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Copy, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

type CopyDashboardButtonProps = {
  sourceId?: string
  shareToken?: string
}

export function CopyDashboardButton({ sourceId, shareToken }: CopyDashboardButtonProps) {
  const router = useRouter()
  const [isCopying, setIsCopying] = useState(false)

  const handleCopy = async () => {
    if (!sourceId && !shareToken) return
    setIsCopying(true)
    try {
      const response = await fetch("/api/dashboards/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          shareToken ? { shareToken } : { sourceId }
        ),
      })
      if (!response.ok) {
        const err = (await response.json()) as { error?: string }
        throw new Error(err.error ?? "Copy failed")
      }
      const data = (await response.json()) as { id: string }
      router.push(`/dashboard/${data.id}`)
      router.refresh()
    } catch {
      // Silent fail
    } finally {
      setIsCopying(false)
    }
  }

  return (
    <Button
      className="h-9 px-3"
      disabled={isCopying}
      onClick={handleCopy}
      type="button"
      variant="outline"
    >
      {isCopying ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Copy className="size-4" />
      )}
      {shareToken ? "Copy to my boards" : "Duplicate"}
    </Button>
  )
}
