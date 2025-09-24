# Uptime Feature (drop-in)

## What was added
- `src/lib/uptime.js` — tiny client for:
  - `${VITE_UPTIME_API_BASE}${VITE_UPTIME_HEALTH_PATH}`
  - `${VITE_UPTIME_API_BASE}${VITE_UPTIME_STATUS_PATH}?oids=...&level=full`
- `src/components/uptime/UptimePanel.jsx` — input + live refresh grid
- `src/components/uptime/UptimeCard.jsx` — per-logger card
- `src/pages/Uptime.jsx` — simple page wrapper (add a route to use)
- `.env.development.local` — default API endpoints

## Use in an existing page
```jsx
import UptimePanel from "@/components/uptime/UptimePanel";
<UptimePanel defaultOids={["9b4bafe7-22b6-4e94-88d1-709f80d0a8a6"]} />
