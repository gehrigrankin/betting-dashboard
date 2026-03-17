const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
const secretKey = process.env.CLERK_SECRET_KEY

function hasPlaceholderValue(value?: string) {
  return /(X{8,}|YOUR_|example|placeholder)/i.test(value ?? "")
}

function hasValidPrefix(value: string | undefined, prefix: "pk" | "sk") {
  return new RegExp(`^${prefix}_(test|live)_`).test(value ?? "")
}

export const isClerkConfigured =
  hasValidPrefix(publishableKey, "pk") && !hasPlaceholderValue(publishableKey)

export const isClerkServerConfigured =
  isClerkConfigured &&
  hasValidPrefix(secretKey, "sk") &&
  !hasPlaceholderValue(secretKey)
