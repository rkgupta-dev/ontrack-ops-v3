# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

`ontrack-ops-v3` is now a working **Vue 3 + Vuetify 3 + Pinia + Vite** app that is migrating the old `operationsapp-frontend`. See `README.md` for setup, environments (local / staging / production), deployment and project layout. Key commands: `npm run dev`, `npm run lint`, `npm run test`, `npm run build`, `npm run deploy:staging`. This repo deploys to **staging only** (https://ontrack-ops-staging.web.app). The production site `ontrack-operations.web.app` still serves the old app; never add a live deploy without explicit sign-off.

## What this project is

Ontrack Operations is a vehicle rental/fleet operations backend+frontend system (bookings, vehicles, customers, payments, GPS tracking, agent attendance, etc.), on-track.in. `ontrack-ops-v3` is the planning ground for a **v3 rewrite/consolidation** of the operations API, currently in **Phase 2: API Inventory & Dependency Map**.

Phase 1 apparently extracted the full inventory of API calls made by the existing production frontend (`operationsapp-frontend`, v6.2.0 — a separate Vue 2 repo, not present here) against its two current backends. That inventory lives in `docs/` and is the primary source of truth in this repo right now.

## docs/ contents

- **`docs/api-reference.md`** — the full endpoint reference. Structured as:
  - A summary table of endpoint counts by business domain (Bookings, Vehicles, Payments, GPS & Tracking, etc.) broken down by backend (Legacy / v2 / bare axios).
  - A "Call chains (waterfalls)" section listing frontend functions that fire multiple sequential requests — these are the primary candidates for collapsing into single composed v3 endpoints.
  - An "Endpoint reference" with one entry per distinct endpoint (IDs `A-001`…`A-172`), each documenting: backend + auth mechanism, inferred purpose, request shape (query/body fields as actually sent), response fields actually read by the frontend, calling file(s)/function(s), any Vuex commits/dispatches triggered, and known issues.
- **`docs/api-inventory.csv`** — the same 172-endpoint inventory as a flat CSV (one row per `A-xxx` ID), with extra columns intended for the migration process: `Disposition`, `Proposed /ops/v3 endpoint`, `Owner`, `Status`, `Notes`. All rows currently show `Status = Not started` — this is the working tracker for driving endpoints from "documented" to "migrated to v3".

## Key facts to know before reasoning about any endpoint

- **Two live backends** are called today, plus stray bare-`axios` calls that bypass the shared HTTP client entirely:
  - **LEGACY** — `api.on-track.in/api`, auth via **static hardcoded Basic auth** (28 endpoints).
  - **v2** — `glacier.on-track.in/api`, auth via **Bearer agentToken** (132 endpoints). This is the actively-developed backend; new v3 endpoints should generally consolidate here or supersede it.
  - **Bare axios** — 12 call sites hit absolute URLs directly (no shared client, no auth interceptor, no centralized 401 handling). These are flagged as technical debt in every entry that has them.
- Request/response fields documented per endpoint reflect **only what the frontend actually sends/reads**, not the backend's full schema — verify against the real backend (per the doc, "verify each with Aranya") before treating a documented shape as a contract.
- Recurring `Issues` tags worth knowing when triaging: `LEGACY backend`, `POST used for a read`, `raw response.data consumed (no envelope)`, `malformed URL (double/triple slash)`, `bypasses shared client (absolute URL, no interceptor, no 401 handling)`, `no pagination params`, `called from N files` (fan-out risk), `redundant test client`.
- Many endpoints exist in **duplicate/near-duplicate pairs** across Legacy and v2 (e.g. `getLocations` on both, `getBookingByQuery` vs `operations/getBookings`) — when proposing a v3 endpoint, check both the CSV `Co-called with` column and the domain section for siblings before assuming an endpoint is standalone.
- The Vuex `commits`/`dispatches` listed per endpoint are the observable state side effects in the current frontend (`store.js` and `store/modules/booking.js`) — useful for understanding blast radius if an endpoint's contract changes.

## Working in this repo

- Treat `docs/api-inventory.csv` as the authoritative row-level tracker: when an endpoint's migration disposition is decided, update its `Disposition` / `Proposed /ops/v3 endpoint` / `Owner` / `Status` / `Notes` columns rather than only noting it in prose elsewhere.
- Keep `docs/api-reference.md` and `docs/api-inventory.csv` in sync — they describe the same 172 endpoints (`A-001`–`A-172`) by the same IDs; an edit to one (new endpoint discovered, purpose corrected, issue added) should be reflected in the other.
