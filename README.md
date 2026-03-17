# Betting Dashboards

Build custom NBA research dashboards so you don't have to do 50 Google searches before every bet.

## Getting Started

1. Copy `.env.example` to `.env.local` and fill in your values.
2. Run database migrations: `npx prisma migrate dev`
3. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | No | Clerk auth (omit for preview mode) |
| `CLERK_SECRET_KEY` | No | Clerk auth secret |
| `OPENAI_API_KEY` | No | LLM widget interpretation (falls back to heuristic parser) |

Without Clerk keys, the app runs in preview mode with a shared demo user. Without OpenAI, widget prompts use the local fallback parser.

## Deploy on Vercel

Set `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, and `CLERK_SECRET_KEY` in your project settings. Run `npx prisma migrate deploy` in the build step if using migrations.
