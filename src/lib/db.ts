import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to initialize Prisma.")
}

function getNormalizedDatabaseUrl(connectionString: string) {
  try {
    const url = new URL(connectionString)

    if (
      url.searchParams.get("sslmode") === "require" &&
      !url.searchParams.has("uselibpqcompat")
    ) {
      // pg now warns that sslmode=require will change semantics later. We want
      // the current strict behavior explicitly.
      url.searchParams.set("sslmode", "verify-full")
    }

    return url.toString()
  } catch {
    return connectionString
  }
}

const adapter = new PrismaPg({
  connectionString: getNormalizedDatabaseUrl(databaseUrl),
})

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

