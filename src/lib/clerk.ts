const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

export const isClerkConfigured = /^pk_(test|live)_/.test(publishableKey ?? "")
