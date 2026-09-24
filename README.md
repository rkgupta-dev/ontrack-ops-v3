# Ontrack Operations v3

The operations app for [on-track.in](https://on-track.in) ops agents: bookings, vehicles,
customers, recovery, reminders, reports, attendance and so on. It is a rewrite of the old
Vue 2 app (`operationsapp-frontend`). It keeps the same routes and features, on Vue 3 +
Vuetify 3 with lazy-loaded pages, a PWA shell and FCM push.

- **Stack:** Vue 3 (`<script setup>`), Vuetify 3, Pinia, Vue Router 4, Axios, Vite 6, Vitest
- **Node:** 22.12+ (`.nvmrc` says `22`; run `nvm use`)
- **Hosting:** Firebase Hosting (project `ontrack-operations`)

---

## 1. Environments at a glance

| Environment    | Frontend URL                                                             | Backend API (`VITE_API_BASE_V2`)                                            | Run / build                                     | Deploy                                                 |
| -------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------ |
| **Local**      | http://localhost:5173                                                    | whatever `.env` says (usually a local backend, `http://localhost:8000/api`) | `npm run dev`                                   | —                                                      |
| **Staging**    | https://ontrack-ops-staging.web.app                                      | https://staging-api.on-track.in/api                                         | `npm run dev:staging` / `npm run build:staging` | `npm run deploy:staging`                               |
| **Production** | https://ontrack-operations.web.app (⚠️ currently serves the **old** app) | https://glacier.on-track.in/api                                             | `npm run build`                                 | **not configured on purpose**, see [§5](#5-production) |

In staging mode the top bar shows an orange **STAGING** label, so you always know which
backend you're on.

> ⚠️ **There is no sandbox for production.** Any build pointed at `glacier.on-track.in`
> reads and writes real bookings, payments and customers. Use **staging** for anything that
> changes data (cancel/end/extend a booking, punch out, update a vehicle, and so on).

---

## 2. Getting started (local)

```bash
nvm use                 # Node 22
npm install
cp .env.example .env    # then fill in the keys, see §3
npm run dev             # http://localhost:5173
```

Log in with your agent employee ID and password for **whichever backend `.env` points at**.
Staging and production have separate accounts.

### Choosing a backend for local dev

Edit `VITE_API_BASE_V2` in `.env`:

| Want to hit…          | Value                                                                    |
| --------------------- | ------------------------------------------------------------------------ |
| Staging (recommended) | `https://staging-api.on-track.in/api`, or just run `npm run dev:staging` |
| A local backend       | `http://localhost:8000/api`                                              |
| Production (careful)  | `https://glacier.on-track.in/api`                                        |

**Running the backend locally:** the API is the separate `backend-nodejs` repo
(`github.com/ontrackBikes/backend-nodejs`). From that repo, run `npm install` and then
`npm run dev`. It listens on `PORT` from its own `.env` (default `3000`). Set `PORT=8000`
there, or change the URL above to match.

---

## 3. Environment files

Vite loads `.env` first, then the mode-specific file on top of it. Only the keys a mode file
sets are overridden.

| File              | Loaded by                                                           | In git?    | Purpose                                            |
| ----------------- | ------------------------------------------------------------------- | ---------- | -------------------------------------------------- |
| `.env.example`    | nobody (template)                                                   | ✅         | copy to `.env`                                     |
| `.env`            | every mode                                                          | ❌ ignored | your local config + secrets                        |
| `.env.staging`    | `--mode staging` (`dev:staging`, `build:staging`, `deploy:staging`) | ✅         | overrides only `VITE_API_BASE_V2` → staging API    |
| `.env.production` | `npm run build`                                                     | ✅         | overrides only `VITE_API_BASE_V2` → production API |

| Key                        | Required | What it is                                                                                                                        |
| -------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_BASE_V2`         | ✅       | v2 backend base URL, **must end in `/api`**                                                                                       |
| `VITE_GOOGLE_MAPS_API_KEY` | optional | reverse geocoding + GPS Tracker map; without it the map shows "Map unavailable"                                                   |
| `VITE_FIREBASE_*`          | optional | FCM push notifications (project `ontrack-notification`)                                                                           |
| `VITE_FIREBASE_VAPID_KEY`  | optional | Firebase console → Cloud Messaging → Web Push certificates; while it's blank, login sends `deviceToken: null` (login still works) |

Only put **public/browser-safe** values in `VITE_*` keys. Everything in them is bundled into
the JS that anyone can download.

---

## 4. Staging deployment

The staging frontend is the Firebase Hosting site **`ontrack-ops-staging`** in project
**`ontrack-operations`**. It always talks to the staging API.

### One-time setup (per machine)

```bash
npm install -g firebase-tools
firebase login                 # use an account with access to the ontrack-operations project
firebase projects:list         # should list ontrack-operations
```

### Deploy

```bash
npm run lint && npm run test   # don't ship red
npm run deploy:staging
```

`deploy:staging` runs `vite build --mode staging` (API → `staging-api.on-track.in/api`) and
then `firebase deploy --only hosting:staging`. When it finishes it prints
`Hosting URL: https://ontrack-ops-staging.web.app`.

### Check it worked

- Open https://ontrack-ops-staging.web.app. You should see the orange **STAGING** label in the
  top bar once you're logged in.
- Reload on a deep link (e.g. `/vehicles/reminders`). It should load the page, not a 404.
- Hard refresh if you still see the old version. The PWA service worker can hold the
  previous build for one load.

### Roll back

Firebase console → **Hosting** → site `ontrack-ops-staging` → **Release history** → pick
the previous release → **Rollback**. Or redeploy an older commit.

### How it's wired

| File            | What it does                                                                                                                                                                                        |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `firebase.json` | hosting target `staging`: serves `dist/`, rewrites every path to `index.html` (SPA routing), `no-cache` on `index.html` / service workers / manifest, 1-year immutable cache on hashed `/assets/**` |
| `.firebaserc`   | default project `ontrack-operations`; maps target `staging` → site `ontrack-ops-staging`                                                                                                            |
| `package.json`  | `build:staging`, `deploy:staging` scripts                                                                                                                                                           |

---

## 5. Production

**Current state (Sep 2026):** https://ontrack-operations.web.app is the **live** ops app, and
it still serves the **old** Vue 2 app, deployed from the `operationsapp-frontend` repo to the
same Firebase site. This repo **deliberately has no production deploy target**, so nobody can
replace the live app by accident while v3 is still being built.

`npm run build` already produces a correct production bundle (API →
`glacier.on-track.in/api`, via `.env.production`). Use `npm run preview` to try it locally.

### When the team decides to switch production to v3

Only do this with explicit sign-off, because it swaps the app every agent uses.

1. Add a second target to `firebase.json` (copy the `staging` block, set `"target": "live"`),
   and make `"hosting"` an array holding both blocks.
2. Map it in `.firebaserc`:
   ```json
   "hosting": {
     "staging": ["ontrack-ops-staging"],
     "live": ["ontrack-operations"]
   }
   ```
3. Add the script
   `"deploy:live": "npm run build && firebase deploy --only hosting:live"`.
4. Deploy to staging first, smoke-test it, then run `npm run deploy:live`.
5. Stop deploying the old repo to the `ontrack-operations` site, or its next deploy will
   overwrite v3.
6. To roll back, use Firebase console → Hosting → `ontrack-operations` → Release history →
   Rollback.

---

## 6. Scripts

| Script                        | What it does                                                                        |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| `npm run dev`                 | local dev server using `.env`                                                       |
| `npm run dev:staging`         | local dev server against the staging API                                            |
| `npm run build`               | production build → `dist/` (production API)                                         |
| `npm run build:staging`       | staging build → `dist/` (staging API)                                               |
| `npm run preview`             | serve the last `dist/` build locally (the PWA service worker only exists in builds) |
| `npm run deploy:staging`      | build for staging and deploy to https://ontrack-ops-staging.web.app                 |
| `npm run lint`                | ESLint + Prettier check, zero warnings allowed                                      |
| `npm run format`              | Prettier-format the whole repo                                                      |
| `npm run test` / `test:watch` | Vitest unit tests                                                                   |

---

## 7. Project layout

```
src/
  pages/<domain>/        one routed page per file (lazy-loaded), e.g. pages/vehicles/RemindersPage.vue
  components/<domain>/   page pieces; components/common/ = shared (EmptyState, FilterChecklist, ConfirmDialog…)
  services/api/          v2Client.js (the one Axios client: Bearer token, global loader, 401 → logout), endpoints.js (every URL)
  services/<domain>/     *.api.js, one function per endpoint, each documented with its A-xxx id + confirmed response shape
  stores/                Pinia stores (auth, ui, list/detail state)
  composables/           useAuth, useAttendance, useQueryFilters (filter state ↔ URL)
  utils/                 pure helpers (dates, currency, export, …); these have unit tests
  router/                routes (index.js) + auth guard (guards.js)
  layouts/               AppLayout (nav rail / bottom nav / top bar), AuthLayout
tests/                   Vitest specs mirroring src/
docs/                    API inventory, see below
public/                  static files, PWA icons, firebase-messaging-sw.js
```

## 8. Conventions for new work

- **Every API call goes through `v2Client`** (`services/api/v2Client.js`) with its URL in
  `endpoints.js`. Never use bare `axios` with an absolute URL.
- **Admin-only actions:** the backend answers a non-admin with **401** + JSON
  `{ error: 1, message }`, which would normally log the agent out. Pass
  `{ allowPermissionDenied: true }` in the request config and check `isPermissionDenied(err)`
  in the page to show a friendly "admins only" message instead (see `models.api.js` /
  `ModelsPage.vue`).
- **Errors:** show `toUserMessage(err)` (`utils/errorMessage.js`), never raw error text.
- **Filters live in the URL** (`useQueryFilters`) so filtered views survive a reload and can
  be shared.
- **Mobile first:** agents mostly use phones. Check every page at ~375px wide.
- **Docs:** when you wire, add or change an endpoint, update **both**
  `docs/api-inventory.csv` (the row's Disposition/Status/Notes) and `docs/api-reference.md`,
  keyed by the same `A-xxx` id.
- Run `npm run lint && npm run test && npm run build` before pushing.

## 9. Reference docs

- `docs/api-reference.md`: every endpoint the old app called (`A-001`…), with request and
  response shapes and known issues.
- `docs/api-inventory.csv`: the same endpoints as a migration tracker (what's migrated, where,
  notes).
- Old app, for reference only (never edit it): `operationsapp-frontend` (Vue 2).
- Backend: `backend-nodejs`. When a response shape is unclear, read its controller.
