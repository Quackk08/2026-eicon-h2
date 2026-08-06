# Deploying to Vercel

The frontend and the API ship as one Vercel project on one domain. That is
deliberate: the client calls `/api/...` as a same-origin relative path
(`frontend/src/api/client.ts`), so there is no API base URL to configure and
no CORS to open up.

## How it fits together

| Piece | Where it comes from |
| --- | --- |
| Static site | `frontend/dist`, built by the Vite build |
| API | `api/index.mjs`, one serverless function that re-exports the Express app from `backend/dist/app.js` |
| API routing | `vercel.json` rewrites `/api/:path*` to that function, carrying the original path in `__vercelPath` |
| Client routes | `vercel.json` rewrites everything except `/api/*` to `index.html` |

The API is routed by an explicit rewrite rather than a filename catch-all
(`api/[...path].mjs`), because the catch-all only ever matched one segment:
`/api/health` worked while `/api/places/search` returned Vercel's own
NOT_FOUND, so most of the API was unreachable in production while every read
that mattered quietly fell back to seed data.

`backend/src/app.ts` builds the Express app and nothing else. Only
`backend/src/index.ts` calls `listen()`, and that file is used exclusively
for local development — a serverless function must never listen on a port.

## Environment variables

Set these in **Vercel → Project → Settings → Environment Variables**. None of
them belong in the repository; `.env` files are gitignored.

Server-side (used by the API function):

| Name | Notes |
| --- | --- |
| `SUPABASE_URL` | Required. |
| `SUPABASE_SECRET_KEY` | Required. **Secret** — bypasses RLS. Never expose to the browser. |
| `GEMINI_API_KEY` | Optional. Without it the rule engine still works, but AI ladder generation is disabled, and the safety classifier fails closed so no generated ladder is ever served. |
| `GEMINI_MODEL` | Optional, defaults to `gemini-flash-lite-latest`. |

Build-time, baked into the JavaScript bundle (`VITE_` prefix means public):

| Name | Notes |
| --- | --- |
| `VITE_SUPABASE_URL` | Same value as `SUPABASE_URL`. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key only. Safe in the browser because every table has RLS enabled with no policies (`backend/supabase/migrations/0004_auth_and_rls.sql`), so this key cannot read application data. |
| `VITE_ALLOW_NO_AUTH` | Optional escape hatch. Set to `true` only to ship a deliberately guest-only build. |

`PORT` and `CLIENT_ORIGIN` are local-development settings and are not needed
on Vercel.

### The two `VITE_` variables are not optional in practice

They are inlined into the bundle at build time, which has two consequences
that have already cost this project a working deployment:

- **Adding them does not fix an existing deployment.** A build that was made
  without them has them baked in as absent. You have to redeploy.
- **Their absence used to be invisible.** The build succeeded, the site
  loaded, and only someone actually trying to sign in would find out — the
  form accepted a password and then answered "not configured in this build".

The frontend build now refuses rather than shipping that, so this fails loudly
at build time instead of silently at sign-in time.

### Checking a deployment

```bash
curl -s https://<domain>/api/health
```

`databaseConfigured` and `missingEnv` name anything the API is missing. If
those two fields are absent from the response, the deployment predates them
and is running old code.

## Supabase

Point the Supabase project at the deployed domain before testing sign-in:

- **Authentication → URL Configuration → Site URL**: the Vercel domain.
- **Redirect URLs**: add the Vercel domain, including preview domains if you
  want sign-in to work on preview deployments.

The migrations in `backend/supabase/migrations/` must already be applied.

## Notes

- Cold starts: the API function sleeps when idle, so the first request after
  a quiet period takes a second or two. Subsequent requests are warm.
- The Gemini free tier allows roughly 20 calls per day, and generating one
  Life Route costs two (generation plus the safety classifier). Deploying
  does not change that ceiling — enable billing before real use.
