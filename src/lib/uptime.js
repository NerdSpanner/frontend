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
