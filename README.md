# PersianBall Monitor

Web dashboard for the PersianBall monitoring panel: sessions, chat activity,
session ratings and comments, issue reports, and coach performance. It uses the
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

Add `?demo` to the URL to explore the dashboard with sample data and no server.

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
- To load the dashboard: five requests in parallel (session metrics, chat
  metrics, coach scores, scores, reports). Comments, charts, rating breakdowns,
  and report summaries are all worked out in the browser from those five.
- After that, nothing more is fetched until someone presses refresh or changes
  the date range or coach filter. There is no polling. The last result is kept
  for the browser tab, so reloading the page doesn't fetch again.
- Changing a report's status sends one `PATCH` and updates the list in place.

## API

Endpoints are documented in `MONITORING_API.md` (backend repo):

- `POST /api/authentication/token/`, `POST /api/authentication/token/refresh/`
- `GET  /api/authentication/user-info/`
- `GET  /api/monitoring/panel/metrics/sessions/`
- `GET  /api/monitoring/panel/metrics/chat-messages/`
- `GET  /api/monitoring/panel/metrics/coach-scores/`
- `GET  /api/monitoring/panel/scores/`
- `GET  /api/monitoring/panel/reports/`
- `PATCH /api/coaching/reports/<id>/`

## Structure

```
src/
  api/        client (auth, refresh, requests), types, sample data
  components/ glass cards, charts, segmented control, toasts
  lib/        formatting, derived metrics, data hook
  pages/      Login, Dashboard shell
  sections/   Overview, Feedback, Reports, Coaches
```
