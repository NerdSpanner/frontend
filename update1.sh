#!/usr/bin/env bash
set -euo pipefail

# add-uptime.sh — inject a minimal uptime widget + API client into NerdSpanner/frontend
# Usage: bash add-uptime.sh
# Safe: only creates new files/dirs or updates .env.development.local by appending.
# It does NOT commit anything.

REPO_DIR="${REPO_DIR:-.}"
cd "$REPO_DIR"

# Helpers
mkfile() {
  local path="$1"
  mkdir -p "$(dirname "$path")"
  cat > "$path"
  echo "Wrote $path"
}

append_if_missing() {
  local file="$1"; local line="$2"
  touch "$file"
  grep -qxF "$line" "$file" || echo "$line" >> "$file"
}

# ---- 1) Env defaults ---------------------------------------------------------
append_if_missing ".env.development.local" "VITE_UPTIME_API_BASE=https://nerdspanner.online"
append_if_missing ".env.development.local" "VITE_UPTIME_STATUS_PATH=/v1/uptime/status"
append_if_missing ".env.development.local" "VITE_UPTIME_HEALTH_PATH=/healthz"

# ---- 2) API client -----------------------------------------------------------
mkfile "src/lib/uptime.js" <<'EOF'
/**
 * Minimal Uptime API client
 * Reads:
 *  - VITE_UPTIME_API_BASE (e.g. https://nerdspanner.online)
 *  - VITE_UPTIME_STATUS_PATH (/v1/uptime/status)
 *  - VITE_UPTIME_HEALTH_PATH (/healthz)
 */

const env = import.meta?.env ?? {};
const BASE = (env.VITE_UPTIME_API_BASE || '').replace(/\/+$/, '');
const STATUS_PATH = env.VITE_UPTIME_STATUS_PATH || '/v1/uptime/status';
const HEALTH_PATH = env.VITE_UPTIME_HEALTH_PATH || '/healthz';

function joinUrl(base, path) {
  const left = (base || '').replace(/\/+$/, '');
  const right = (path || '').replace(/^\/+/, '');
  return `${left}/${right}`;
}

export function uptimeHealthUrl() {
  return joinUrl(BASE, HEALTH_PATH);
}

export function uptimeStatusUrl(oids = [], level = 'full') {
  const url = new URL(joinUrl(BASE, STATUS_PATH));
  if (Array.isArray(oids) && oids.length) url.searchParams.set('oids', oids.join(','));
  if (level) url.searchParams.set('level', level);
  return url.toString();
}

/** Fetch `true/false` health */
export async function fetchUptimeHealth() {
  const r = await fetch(uptimeHealthUrl(), { method: 'GET', credentials: 'omit' });
  if (!r.ok) return false;
  const j = await r.json().catch(() => ({}));
  return !!j.ok;
}

/**
 * Fetch uptime status items.
 * Returns { generated_at, items: [{ oid, type, state, last_seen, latency_ms, stage }] }
 */
export async function fetchUptimeStatus(oids = [], level = 'full') {
  const url = uptimeStatusUrl(oids, level);
  const r = await fetch(url, { method: 'GET', credentials: 'omit' });
  if (!r.ok) throw new Error(`Uptime status HTTP ${r.status}`);
  return r.json();
}

/** Utilities */
export function formatAgoFromEpochSeconds(sec) {
  if (!sec) return 'unknown';
  const ms = sec * 1000;
  const diff = Date.now() - ms;
  const s = Math.max(0, Math.floor(diff / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function stateBadgeColor(state) {
  switch ((state || '').toLowerCase()) {
    case 'online': return 'bg-green-500/20 text-green-700 border-green-500/40';
    case 'offline': return 'bg-red-500/20 text-red-700 border-red-500/40';
    default: return 'bg-gray-500/20 text-gray-700 border-gray-500/40';
  }
}
EOF

# ---- 3) UI components --------------------------------------------------------
mkfile "src/components/uptime/UptimeCard.jsx" <<'EOF'
import React from "react";
import { formatAgoFromEpochSeconds, stateBadgeColor } from "@/lib/uptime";

export default function UptimeCard({ item }) {
  const { oid, type, state, last_seen, latency_ms, stage } = item || {};
  const badge = stateBadgeColor(state);

  return (
    <div className="rounded-2xl border p-4 shadow-sm bg-white/70 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex h-2.5 w-2.5 rounded-full ${
            state?.toLowerCase() === "online" ? "bg-green-500" :
            state?.toLowerCase() === "offline" ? "bg-red-500" : "bg-gray-400"
          }`} />
          <span className="text-sm uppercase tracking-wide text-gray-600">{type || "unknown"}</span>
        </div>
        <span className={`px-2.5 py-1 text-xs border rounded-full font-medium ${badge}`}>
          {state || "unknown"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div className="space-y-1">
          <div className="text-gray-500">OID</div>
          <code className="block text-xs break-all text-gray-900">{oid || "—"}</code>
        </div>
        <div className="space-y-1">
          <div className="text-gray-500">Latency</div>
          <div className="text-gray-900">{latency_ms != null ? `${latency_ms} ms` : "—"}</div>
        </div>
        <div className="space-y-1">
          <div className="text-gray-500">Last seen</div>
          <div className="text-gray-900">{last_seen ? formatAgoFromEpochSeconds(last_seen) : "—"}</div>
        </div>
        <div className="space-y-1">
          <div className="text-gray-500">Stage</div>
          <div className="text-gray-900">{stage ?? "—"}</div>
        </div>
      </div>
    </div>
  );
}
EOF

mkfile "src/components/uptime/UptimePanel.jsx" <<'EOF'
import React, { useEffect, useMemo, useRef, useState } from "react";
import UptimeCard from "./UptimeCard";
import { fetchUptimeHealth, fetchUptimeStatus } from "@/lib/uptime";

const LS_KEY = "uptime_oids";

export default function UptimePanel({ defaultOids = [] }) {
  const [oids, setOids] = useState(() => {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) return saved.split(",").map(s => s.trim()).filter(Boolean);
    if (defaultOids?.length) return defaultOids;
    return [];
  });
  const [items, setItems] = useState([]);
  const [healthOk, setHealthOk] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const timerRef = useRef(null);

  const textValue = useMemo(() => oids.join(","), [oids]);

  async function refresh() {
    setErr("");
    setLoading(true);
    try {
      const data = await fetchUptimeStatus(oids, "full");
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setErr(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  function setFromInput(v) {
    const list = (v || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
    setOids(list);
    localStorage.setItem(LS_KEY, list.join(","));
  }

  useEffect(() => {
    fetchUptimeHealth().then(setHealthOk).catch(() => setHealthOk(false));
  }, []);

  useEffect(() => {
    if (!oids.length) { setItems([]); return; }
    refresh();
    clearInterval(timerRef.current);
    timerRef.current = setInterval(refresh, 15000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oids.join(",")]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
        <div className="flex-1">
          <label className="block text-sm text-gray-600 mb-1">OIDs (comma-separated)</label>
          <input
            className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400"
            placeholder="oid1,oid2,oid3"
            value={textValue}
            onChange={e => setFromInput(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={refresh}
            className="rounded-xl border px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
            disabled={!oids.length || loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <span className={`self-center text-xs px-2 py-1 rounded-full border ${
            healthOk === null ? "opacity-60" :
            healthOk ? "bg-green-500/20 text-green-700 border-green-500/40" :
                       "bg-red-500/20 text-red-700 border-red-500/40"
          }`}>
            API {healthOk === null ? "…" : healthOk ? "healthy" : "down"}
          </span>
        </div>
      </div>

      {!oids.length && (
        <div className="text-sm text-gray-500">Enter one or more OIDs to begin.</div>
      )}

      {err && (
        <div className="text-sm text-red-600">Error: {err}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {items.map((it) => (
          <UptimeCard key={it.oid} item={it} />
        ))}
      </div>
    </div>
  );
}
EOF

# ---- 4) Optional standalone page (wire a route when ready) -------------------
mkfile "src/pages/Uptime.jsx" <<'EOF'
import React from "react";
import UptimePanel from "@/components/uptime/UptimePanel";

export default function UptimePage() {
  // Replace defaults with DB-driven OIDs when you hook it up
  const defaults = ["9b4bafe7-22b6-4e94-88d1-709f80d0a8a6"];
  return (
    <div className="p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Uptime</h1>
        <p className="text-sm text-gray-600">Live status from nerdspanner.online</p>
      </div>
      <UptimePanel defaultOids={defaults} />
    </div>
  );
}
EOF

# ---- 5) README snippet for quick wiring -------------------------------------
mkfile "README_UPTIME.md" <<'EOF'
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
