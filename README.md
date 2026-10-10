# PersianBall Monitor

Single-page monitoring dashboard for PersianBall, laid out as five numbered steps
(Snapshot, Sessions, Coaches, Reports, Comments): new users and buyers, platforms,
sessions and chats per coach and student, workouts, reports and app comments. Every
chart uses live data from the backend. Charts whose endpoint isn't on the server yet
show "Coming soon" (see `MONITORING_REQUESTS.md`). It uses the
same sign-in as the mobile app, and only support, staff, or superuser accounts
can enter.

Built with React 19, TypeScript, Vite, Framer Motion, and Recharts.

## Run

```bash
npm install
npm run dev        # http://localhost:5173, /api is proxied to app.footballdrillz.com
npm run build      # static files in dist/
npm run preview    # serve the production build locally
```

## Configuration

Copy `.env.example` to `.env.local` and adjust:

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE` | API origin for production builds, e.g. `https://app.footballdrillz.com`. Leave empty to call `/api` on the same origin. |
| `VITE_PROXY_TARGET` | Where the dev server proxies `/api` to. |

If the dashboard is hosted on a different domain from the API, that domain
must be allowed in the backend's CORS settings. Serving `dist/` under the
API's domain (for example at `/monitor/`) avoids that.

## Data loading

The dashboard reads the server only when it has to:

- On sign-in: one token request and one `user-info` request.
- To load the page: six groups of requests in parallel (new users, sessions, chat,
  coaches & students, reports, comments). A progress card ticks each one off.
- Picking a coach loads that coach's drill-down (six monthly session counts plus one
  count per student), four requests at a time. Each coach is cached for the period.
- After that, nothing more is fetched until someone presses refresh or changes
  the date range or coach filter. There is no polling. The last result is kept
  for the browser tab, so reloading the page doesn't fetch again.

## API

Endpoints are documented in `MONITORING_API.md` (backend repo):

- `POST /api/authentication/token/`, `POST /api/authentication/token/refresh/`
- `GET  /api/authentication/user-info/`
- `GET  /api/monitoring/panel/metrics/sessions/`
- `GET  /api/monitoring/panel/metrics/chat-messages/`
- `GET  /api/monitoring/panel/metrics/coach-students/`
- New, see `MONITORING_REQUESTS.md`: `metrics/users/`, `metrics/chat-students/`, `metrics/coach-chats/`, `metrics/coach-workouts/`, `metrics/comments/`
- `GET  /api/monitoring/panel/reports/`

## Structure

```
src/
  api/        client (auth, refresh, requests), types
  components/ glass cards, charts, segmented control, toasts
  lib/        formatting, derived metrics, data hook
  pages/      Login, Dashboard shell
  sections/   Monitor (the five steps), step navigator, loading progress
```

The earlier multi-tab version is kept under the git tag `crowded_version`.
