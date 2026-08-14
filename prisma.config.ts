import { config } from "dotenv"
import { defineConfig, env } from "prisma/config"

// Next.js keeps local secrets in .env.local, which `dotenv/config` does not
// read — it only loads `.env`. So DATABASE_URL was never defined by the time
// this config resolved it, and every `prisma generate` failed with
// PrismaConfigEnvError. The generated client silently stayed at whatever
// version last succeeded: it was five months stale, and every one of the nine
// type errors that produced (a missing `alert` model, a missing `isTemplate`
// field) looked like a code bug rather than a client that had never been
// regenerated. .env still loads, and still wins where both define a key.
config({ path: [".env", ".env.local"] })

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
})
