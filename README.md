# governedai

AI governance platform — inventory of AI systems, review workflow, and an
exportable evidence/audit trail. See [`docs/mvp-scope.md`](docs/mvp-scope.md)
for what the MVP covers and [`docs/solo-founder-execution-plan.md`](docs/solo-founder-execution-plan.md)
for the broader plan.

## Stack

Next.js (App Router, TypeScript) + Prisma/Postgres + Auth.js (magic-link
email via Resend) + Cloudflare R2 for evidence file uploads.

## Structure
- `src/app/` - Next.js routes
- `src/lib/` - shared server code (Prisma client, etc.)
- `src/auth.ts` - Auth.js config
- `prisma/schema.prisma` - data model
- `tests/` - automated tests
- `docs/` - design and documentation
- `scripts/` - utility scripts

## Getting started

```bash
pnpm install
cp .env.example .env.local   # fill in DATABASE_URL, AUTH_SECRET, etc.
pnpm exec prisma migrate dev # create the database schema
pnpm dev
```

Requires a Postgres database (Neon or Supabase free tier both work) — set
`DATABASE_URL` in `.env.local` before running `prisma migrate dev`.

## Testing

```bash
pnpm test        # Vitest — pure logic (permissions, workflow, audit export)
pnpm test:watch  # same, in watch mode
pnpm test:e2e    # Playwright — auth-gate smoke tests, starts its own dev server
```

`test:e2e` only covers unauthenticated behavior (redirects, page rendering)
for now — a real end-to-end flow through sign-in needs a test-only auth
bypass, since Auth.js's magic-link flow can't be driven headlessly without
one (see the comment in `src/auth.ts`).
