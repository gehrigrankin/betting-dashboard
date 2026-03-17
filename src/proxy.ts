import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { isClerkServerConfigured } from "@/lib/clerk"

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/api/dashboards(.*)"])

const proxy = isClerkServerConfigured
  ? clerkMiddleware(async (auth, request) => {
      if (isProtectedRoute(request)) {
        await auth.protect()
      }
    })
  : () => NextResponse.next()

export default proxy

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
