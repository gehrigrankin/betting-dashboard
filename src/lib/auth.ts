import { auth } from "@clerk/nextjs/server"
import { isClerkServerConfigured } from "@/lib/clerk"

/** When Clerk is not configured, all users share this preview workspace. */
export const PREVIEW_USER_ID = "preview-user"

/** Returns the current user's ID for dashboard ownership, or PREVIEW_USER_ID when auth is not set up. */
export async function getCurrentDashboardOwnerId() {
  if (!isClerkServerConfigured) {
    return PREVIEW_USER_ID
  }

  const { userId } = await auth()
  return userId
}
