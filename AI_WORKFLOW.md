# AI Workflow Note

## Tools used

- **Claude Code** (Claude Opus, inside VS Code). I used it as a pair programmer for planning, scaffolding, writing code, running tests and smoke-testing the deployment.
- I made the product decisions: scope, what to cut, the data model, the access rules and the conflict strategy. I reviewed every change before accepting it.

## Where AI materially sped things up

- **Turning the brief into a timeboxed plan.** It drafted a plan with a list of what to cut first if I fell behind, which kept the build on schedule.
- **Repetitive code.** The schema, route handlers, zod validation, Tailwind UI, the editor toolbar and the share dialog took minutes instead of hours.
- **Glue between libraries.** Wiring marked, mammoth and sanitize-html into Tiptap JSON on the server, and Markdown export with turndown.
- **Tests.** It listed the edge cases (strangers, viewers trying to write, stale saves, corrupt `.docx`) and wrote the integration suite against an in-memory Postgres.
- **Verification.** It wrote and ran curl scripts that tested every API flow against the live Vercel deployment as Alice, Bob and Carol.

## What I changed or rejected

- **Prisma → Drizzle + PGlite.** The first plan used Prisma. I switched to Drizzle so the same schema runs on Neon in production and on PGlite locally and in tests. That means reviewers can run `npm run dev` without setting up a database, and the tests use a real Postgres engine instead of mocks.
- **403 → 404 for documents you can't access**, so the API doesn't reveal which document IDs exist.
- **Last-write-wins → 409 conflict check.** Silently overwriting a teammate's edits wasn't acceptable, even without real-time collaboration.
- **Outdated framework knowledge.** The AI's default patterns were older than the versions installed:
  - Next.js 16 renamed `middleware` to `proxy`.
  - Cache Components needs `useParams()` wrapped in `<Suspense>`. The production build caught this, and we fixed it.
  - Zod 4 changed `email()`, `passthrough()` and `datetime()`.

  I had it read the Next.js docs bundled in `node_modules` instead of trusting memory.
- **React Compiler lint error.** The autosave function scheduled itself in a way the linter flagged as unsafe (the AI's version). We changed it to use a ref.
- **Import safety.** I made sure imported Markdown and Word HTML is sanitized on the server against an allow-list before it's stored, and doesn't rely only on the editor's schema.
- **Housekeeping.** A failed smoke-test run left scratch files in the repo, and they were committed. I caught this in `git status` and removed them.

## How I verified correctness, UX and reliability

- **Automated:** 27 Vitest tests (permission matrix, import/sanitize, export, and integration tests on PGlite of the full sharing flow and the conflict check), plus `tsc` and ESLint with no errors.
- **Production build** (`next build`) passes. It was run locally before every push.
- **Live deployment smoke test** over HTTP:
  - Login, including the wrong-password error.
  - Seeded shares appear for Bob (editor) and Carol (viewer).
  - Create → save → reload keeps formatting.
  - 404 before sharing; 403 when a viewer edits; editing works after upgrading to editor; 404 after revoking.
  - Sharing with an unknown email gives a clear error.
  - `.md`, `.txt` and a real `.docx` import correctly; `.pdf` is rejected.
- **Manual UI pass** in the browser: formatting toolbar, autosave status, rename, read-only mode, share dialog, and opening the same document in two tabs to trigger the conflict banner.
- **Failing safely:** a missing `SESSION_SECRET` showed up during local smoke testing as a 500 error. That's intentional; production refuses to sign sessions with a default secret.
