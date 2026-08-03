# Deploying to Vercel

The frontend and the API ship as one Vercel project on one domain. That is
deliberate: the client calls `/api/...` as a same-origin relative path
(`frontend/src/api/client.ts`), so there is no API base URL to configure and
no CORS to open up.

## How it fits together

| Piece | Where it comes from |
| --- | --- |
| Static site | `frontend/dist`, built by the Vite build |
| API | `api/[...path].mjs`, a catch-all serverless function that re-exports the Express app from `backend/dist/app.js` |
| Client routes | `vercel.json` rewrites everything except `/api/*` to `index.html` |

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
| `GEMINI_MODEL` | Optional, defaults to `gemini-2.0-flash`. |

Build-time, baked into the JavaScript bundle (`VITE_` prefix means public):

| Name | Notes |
| --- | --- |
| `VITE_SUPABASE_URL` | Same value as `SUPABASE_URL`. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key only. Safe in the browser because every table has RLS enabled with no policies (`backend/supabase/migrations/0004_auth_and_rls.sql`), so this key cannot read application data. |

`PORT` and `CLIENT_ORIGIN` are local-development settings and are not needed
on Vercel.

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
