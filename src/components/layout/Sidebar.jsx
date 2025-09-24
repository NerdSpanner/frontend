// Sidebar.jsx (patched)
// - Scope dropdown (Private/Public) with dividers
// - Headings: Home, Dashboards, Hardware, Variables, Hierarchy
// - Consistent behavior for Fleets (no special-casing)
// - Hide items with 0 count; show top-5 lists for Dashboards/Variables when provided
// - Default to Public when no private data
// - Bottom status strip with uptime counts (graceful "Network unavailable")

import {
  FaChevronDown,
  FaChevronUp,
  FaHome,
  FaDatabase,
  FaMicrochip,
  FaSitemap,
  FaListUl,
  FaLock,
  FaUnlock,
  FaWifi,
  FaLink,
  FaServer,
} from "react-icons/fa";
import { useEffect, useMemo, useState } from "react";
import classNames from "classnames";

// ---- Env detection (match App.jsx dev/prod headers)
const AUTH_DISABLED = import.meta.env.VITE_AUTH_DISABLED === "true";
const API_BASE = import.meta.env.VITE_API_BASE || "/api"; // Pages Functions base
const DEV_UID = String(import.meta.env.VITE_FAKE_UID || "dev");

// Optional external uptime API (public tunnel or local)
const UPTIME_API = (import.meta.env.VITE_UPTIME_API || "https://nerdspanner.online").replace(/\/+$/, "");

// Shared fetch that mirrors App.jsx behavior
async function fetchJSON(path, token = "") {
  const headers = {};
  if (AUTH_DISABLED) {
    headers["x-dev-uid"] = DEV_UID;
  } else if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

function Divider() {
  return <div className="my-2 border-t border-[--color-border] opacity-70" />;
}

function SectionHeader({ children }) {
  return (
    <p className="text-xs uppercase font-medium text-muted-foreground px-2 mb-1">
      {children}
    </p>
  );
}

function Collapsible({ id, icon: Icon, label, startOpen = false, children, onToggle }) {
  const [open, setOpen] = useState(startOpen);
  return (
    <div className="mb-2">
      <button
        className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted transition text-sm"
        onClick={() => {
          setOpen(!open);
          onToggle?.(!open);
        }}
      >
        <span className="flex items-center gap-2">
          <Icon />
          {label}
        </span>
        {open ? <FaChevronUp /> : <FaChevronDown />}
      </button>
      {open && <div className="ml-4 mt-1">{children}</div>}
    </div>
  );
}

function ItemRow({ label, count, icon: Icon, disabled, onClick }) {
  if (count === 0) return null; // hide zero-counts per request
  return (
    <div
      className={classNames(
        "flex items-center justify-between text-sm px-2 py-1 rounded hover:bg-muted cursor-pointer",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onClick={() => !disabled && onClick?.()}
    >
      <span className="flex items-center gap-2">
        {Icon && <Icon />}
        {label}
      </span>
      {typeof count === "number" && <span className="text-xs text-muted-foreground">{count}</span>}
    </div>
  );
}

export default function Sidebar() {
  // Sidebar data from API (/api/sidebar)
  const [sbar, setSbar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState(/** 'private' | 'public' */ "private");
  const [error, setError] = useState(null);

  // Uptime summary (bottom strip)
  const [uptime, setUptime] = useState(null);
  const [uptimeErr, setUptimeErr] = useState(null);

  // Local expansion memory
  const [open, setOpen] = useState({
    home: true,
    dashboards: true,
    hardware: true,
    variables: true,
    hierarchy: true,
  });

  // Load sidebar data (independent of App.jsx so this works even if MainLayout didn’t pass it down)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchJSON("/sidebar");
        if (cancelled) return;

        setSbar(data);

        // If no private data at all, default to public
        const yourCounts = (() => {
          try {
            const your = data.sections?.find((s) => s.key === "your");
            const totals = { n: 0 };
            if (your?.groups) {
              for (const g of your.groups) {
                for (const it of g.items || []) {
                  if (typeof it.count === "number") totals.n += it.count;
                }
              }
            }
            return totals.n;
          } catch {
            return 0;
          }
        })();

        if (yourCounts === 0) setScope("public");
      } catch (e) {
        if (!cancelled) {
          setError(String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load uptime summary for the strip; tolerate failure
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setUptimeErr(null);
        const res = await fetch(`${UPTIME_API}/v1/heartbeat/summary`, { cache: "no-store" });
        if (!res.ok) throw new Error(`uptime ${res.status}`);
        const js = await res.json();
        if (!cancelled) setUptime(js);
      } catch (e) {
        if (!cancelled) setUptimeErr(String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeSection = useMemo(() => {
    if (!sbar?.sections) return null;
    const key = scope === "public" ? "public" : "your";
    return sbar.sections.find((s) => s.key === key) || null;
  }, [sbar, scope]);

  // Helpers to get counts & optional “top 5” lists if API provides them
  function findGroup(key) {
    if (!activeSection?.groups) return null;
    return activeSection.groups.find((g) => g.key === key) || null;
  }

  // Try to read optional lists:
  // Expect shapes like: group.items contains { key, label, count }
  // And optionally group.top?.dashboards / group.top?.variables arrays of {name,id}
  const dashboardsGroup = useMemo(() => {
    // private: data -> dashboards; public: data_pub -> dashboards_pub
    return findGroup(scope === "public" ? "data_pub" : "data");
  }, [activeSection, scope]);

  const variablesGroup = useMemo(() => {
    return findGroup(scope === "public" ? "data_pub" : "data");
  }, [activeSection, scope]);

  const hardwareGroup = useMemo(() => {
    return findGroup(scope === "public" ? "hardware_pub" : "hardware") || findGroup(scope === "public" ? "hierarchy_pub" : "hierarchy"); // fallback if API didn’t split
  }, [activeSection, scope]);

  const hierarchyGroup = useMemo(() => {
    return findGroup(scope === "public" ? "hierarchy_pub" : "hierarchy");
  }, [activeSection, scope]);

  // Extract counts by item key if available
  function countByKey(g, key, altKey) {
    if (!g?.items) return undefined;
    const it = g.items.find((x) => x.key === key || x.key === altKey);
    return typeof it?.count === "number" ? it.count : undefined;
  }

  // Compute hardware counts using item keys (standardized in your /api/sidebar)
  const hwCounts = useMemo(() => {
    const g = hardwareGroup;
    return {
      oracles: countByKey(g, scope === "public" ? "oracles_pub" : "oracles"),
      loggers: countByKey(g, scope === "public" ? "loggers_pub" : "loggers"),
      nodes:   countByKey(g, scope === "public" ? "nodes_pub"   : "nodes"),
    };
  }, [hardwareGroup, scope]);

  const dataCounts = useMemo(() => {
    const g = dashboardsGroup;
    return {
      dashboards: countByKey(g, scope === "public" ? "dashboards_pub" : "dashboards"),
      variables:  countByKey(variablesGroup, scope === "public" ? "variables_pub" : "variables") ??
                  countByKey(hierarchyGroup, scope === "public" ? "variables_pub2" : "variables_h"),
    };
  }, [dashboardsGroup, variablesGroup, hierarchyGroup, scope]);

  const hierCounts = useMemo(() => {
    const g = hierarchyGroup;
    return {
      companies: countByKey(g, scope === "public" ? "companies_pub" : "companies"),
      locations: countByKey(g, scope === "public" ? "locations_pub" : "locations"),
      fleets:    countByKey(g, scope === "public" ? "fleets_pub"    : "fleets"),
      assets:    countByKey(g, scope === "public" ? "assets_pub"    : "assets"),
      variables: countByKey(g, scope === "public" ? "variables_pub2": "variables_h"),
    };
  }, [hierarchyGroup, scope]);

  // Optional top lists (show only if the API provides any names)
  const topDashboards = useMemo(() => {
    const tops = dashboardsGroup?.top?.dashboards || dashboardsGroup?.dashboards || []; // accept either shape
    return Array.isArray(tops) ? tops.slice(0, 5) : [];
  }, [dashboardsGroup]);

  const topVariables = useMemo(() => {
    const tops = variablesGroup?.top?.variables || variablesGroup?.variables || [];
    return Array.isArray(tops) ? tops.slice(0, 5) : [];
  }, [variablesGroup]);

  return (
    <aside className="w-64 h-screen border-r text-foreground p-3 bg-[--color-sidebar] border-[--color-border] flex flex-col">
      {/* Brand */}
      <div className="flex items-center justify-between mb-3 px-1">
        <img src="/nsn1_md.png" alt="Logo" className="h-10 w-auto" />
      </div>

      {/* Scope selector with dividers */}
      <Divider />
      <div className="px-2 mb-2">
        <label className="text-xs uppercase font-medium text-muted-foreground block mb-1">Scope</label>
        <div className="relative">
          <select
            className="w-full text-sm bg-background border border-[--color-border] rounded px-3 py-2 pr-8"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
          >
            <option value="private">Private</option>
            <option value="public">Public</option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
            {scope === "public" ? <FaUnlock /> : <FaLock />}
          </div>
        </div>
      </div>
      <Divider />

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && <div className="px-2 py-1 text-sm text-muted-foreground">Loading…</div>}
        {error && <div className="px-2 py-1 text-sm text-red-600">Sidebar error: {String(error)}</div>}

        {/* Home */}
        <SectionHeader>Home</SectionHeader>
        <div className="mb-3">
          <ItemRow label="Dashboard Overview" icon={FaHome} onClick={() => { /* route */ }} />
        </div>

        {/* Dashboards */}
        <SectionHeader>Dashboards</SectionHeader>
        <Collapsible id="dashboards" icon={FaDatabase} label="Dashboards" startOpen={true}>
          <ItemRow label="All" count={dataCounts.dashboards} icon={FaListUl} onClick={() => {}} />
          {/* Top 5 only if any exist */}
          {topDashboards.length > 0 && (
            <div className="mt-1 ml-1">
              {topDashboards.map((d, i) => (
                <ItemRow key={d.id || d.DID || d.name || i} label={d.name || d.Name || `Dashboard ${i+1}`} onClick={() => {}} />
              ))}
              <ItemRow label="See more…" onClick={() => {}} />
            </div>
          )}
        </Collapsible>

        {/* Hardware */}
        <SectionHeader>Hardware</SectionHeader>
        <Collapsible id="hardware" icon={FaDatabase} label="Hardware" startOpen={true}>
          <ItemRow label="Oracles" count={hwCounts.oracles} icon={FaLink} onClick={() => {}} />
          <ItemRow label="Loggers" count={hwCounts.loggers} icon={FaWifi} onClick={() => {}} />
          <ItemRow label="Nodes"   count={hwCounts.nodes}   icon={FaServer} onClick={() => {}} />
        </Collapsible>

        {/* Variables */}
        <SectionHeader>Variables</SectionHeader>
        <Collapsible id="variables" icon={FaListUl} label="Variables" startOpen={true}>
          <ItemRow label="All" count={dataCounts.variables} onClick={() => {}} />
          {topVariables.length > 0 && (
            <div className="mt-1 ml-1">
              {topVariables.map((v, i) => (
                <ItemRow key={v.id || v.VID || v.name || i} label={v.name || v.VarName || `Variable ${i+1}`} onClick={() => {}} />
              ))}
              <ItemRow label="See more…" onClick={() => {}} />
            </div>
          )}
        </Collapsible>

        {/* Hierarchy */}
        <SectionHeader>Hierarchy</SectionHeader>
        <Collapsible id="hierarchy" icon={FaSitemap} label="Hierarchy" startOpen={true}>
          <ItemRow label="Companies" count={hierCounts.companies} onClick={() => {}} />
          <ItemRow label="Locations" count={hierCounts.locations} onClick={() => {}} />
          <ItemRow label="Fleets"    count={hierCounts.fleets}    onClick={() => {}} />
          <ItemRow label="Assets"    count={hierCounts.assets}    onClick={() => {}} />
          <ItemRow label="Variables" count={hierCounts.variables} onClick={() => {}} />
        </Collapsible>
      </div>

      {/* Bottom status strip */}
      <div className="mt-2 pt-2 border-t border-[--color-border]">
        <div className="px-2 text-xs uppercase font-medium text-muted-foreground mb-1">Network Status</div>
        {uptimeErr && (
          <div className="px-2 py-1 text-sm text-muted-foreground italic">Network unavailable</div>
        )}
        {!uptimeErr && (
          <div className="px-2 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-background border border-[--color-border] p-2">
              <div className="text-[10px] uppercase text-muted-foreground">Nodes</div>
              <div className="text-sm font-semibold">{uptime?.counts?.node?.online ?? 0} / {uptime?.counts?.node?.total ?? 0}</div>
            </div>
            <div className="rounded-lg bg-background border border-[--color-border] p-2">
              <div className="text-[10px] uppercase text-muted-foreground">Oracles</div>
              <div className="text-sm font-semibold">{uptime?.counts?.oracle?.online ?? 0} / {uptime?.counts?.oracle?.total ?? 0}</div>
            </div>
            <div className="rounded-lg bg-background border border-[--color-border] p-2">
              <div className="text-[10px] uppercase text-muted-foreground">Loggers</div>
              <div className="text-sm font-semibold">{uptime?.counts?.logger?.online ?? 0} / {uptime?.counts?.logger?.total ?? 0}</div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
