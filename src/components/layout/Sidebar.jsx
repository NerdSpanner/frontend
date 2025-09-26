// src/components/layout/Sidebar.jsx
import {
  FaChevronDown,
  FaChevronUp,
  FaDatabase,
  FaWifi,
  FaLink,
  FaServer,
  FaListUl,
  FaSitemap,
  FaGlobe,
  FaUser,
  FaChartBar,
  FaSignOutAlt,
  FaCog,
  FaBuilding,
  FaMapMarkerAlt,
  FaTruck,
  FaBoxes,
  FaSlidersH,
} from "react-icons/fa";
import { useEffect, useMemo, useState, useRef } from "react";
import { getSidebar } from "@/services/sidebar";

// --- small utilities ---------------------------------------------------------
async function fetchJSON(url, init) {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

const UPTIME_API = "https://nerdspanner.online"; // adjust if yours is different

// --- building blocks ----------------------------------------------------------
function SectionHeader({ children }) {
  return (
    <div className="mt-2 mb-1 text-xs uppercase font-medium text-muted-foreground px-1">
      {children}
    </div>
  );
}

function ItemRow({ item, label, count, icon: Icon, onClick }) {
  // allow either full `item` prop or simple {label,count,icon}
  const _label = label ?? item?.label ?? "—";
  const _count = count ?? item?.count;
  const disabled = typeof _count === "number" && _count === 0;

  return (
    <div
      className={[
        "flex items-center justify-between px-3 py-2 text-xs leading-tight",
        "border-b border-[--color-border] last:border-b-0",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-background transition",
      ].join(" ")}
      onClick={() => {
        if (disabled) return;
        onClick?.(item ?? { label: _label, count: _count });
      }}
    >
      <span className="flex items-center gap-2">
        {Icon ? <Icon /> : null}
        {_label}
      </span>
      {_count !== undefined && <span className="text-xs text-muted-foreground">{_count}</span>}
    </div>
  );
}

function Collapsible({ id, icon: Icon, label, startOpen = false, onToggle, children, collapsed = false }) {
  const [hovered, setHovered] = useState(false);
  const [popPos, setPopPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const [open, setOpen] = useState(!!startOpen);

  // keep internal state in sync if parent changes `startOpen`
  useEffect(() => {
    setOpen(!!startOpen);
  }, [startOpen]);

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      onToggle?.(next, id);
      return next;
    });
  };

  return (
    <div className="mb-2 relative">
      <button
        ref={btnRef}
        type="button"
        className={[
          "w-full flex items-center rounded-md hover:bg-muted",
          collapsed ? "justify-center px-0 py-2" : "justify-between px-2 py-2 text-left",
        ].join(" ")}
        onClick={toggle}
        aria-expanded={open}
        aria-controls={`collapsible-${id}`}
        onMouseEnter={() => {
          if (!collapsed) return;
          const r = btnRef.current?.getBoundingClientRect();
          if (r) setPopPos({ top: Math.max(8, r.top), left: r.right + 8 });
          setHovered(true);
        }}
        onMouseLeave={() => collapsed && setHovered(false)}
        onFocus={() => {
          if (!collapsed) return;
          const r = btnRef.current?.getBoundingClientRect();
          if (r) setPopPos({ top: Math.max(8, r.top), left: r.right + 8 });
          setHovered(true);
        }}
        onBlur={() => collapsed && setHovered(false)}
      >
        <span className="flex items-center gap-2">
          {Icon ? <Icon className="opacity-80" /> : null}
          {!collapsed && <span className="text-sm">{label}</span>}
        </span>
        {!collapsed && (open ? <FaChevronUp /> : <FaChevronDown />)}
      </button>

      {open && !collapsed && (
        <div id={`collapsible-${id}`} className="mt-1 rounded-lg border border-[--color-border] bg-background overflow-hidden">
          {children}
        </div>
      )}

      {collapsed && hovered && (
        <div
className="fixed z-[100] w-64 max-h-[70vh] overflow-y-auto rounded-none border border-[--color-border] bg-background shadow-xl p-2"
          style={{ top: popPos.top, left: popPos.left }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <div className="text-xs uppercase font-medium text-muted-foreground mb-2">{label}</div>
          {children}
        </div>
      )}
    </div>
  );
}

// --- main component -----------------------------------------------------------
export default function Sidebar({ collapsed = false, user, onLogout, onSettings }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sbar, setSbar] = useState(null);
  const [scope, setScope] = useState("your"); // "your" | "public"

  // group open state (this is what now propagates)
  const [open, setOpen] = useState({
    dashboards: true,
    hardware: true,
    variables: true,
    hierarchy: true,
  });

  // uptime strip (tolerate failure)
  const [uptime, setUptime] = useState(null);
  const [uptimeErr, setUptimeErr] = useState(null);

  // derived logger color based on online/total
  const logOnline = Number(uptime?.counts?.logger?.online ?? 0);
  const logTotal = Number(uptime?.counts?.logger?.total ?? 0);
  const loggerColor = logTotal === 0
    ? "text-muted-foreground"
    : (logOnline === 0
      ? "text-red-600"
      : (logOnline === logTotal ? "text-green-600" : "text-amber-600"));
  const loggerDotClass = logTotal === 0
    ? "bg-gray-400"
    : (logOnline === 0
      ? "bg-red-500"
      : (logOnline === logTotal ? "bg-green-500" : "bg-amber-500"));

  // load sidebar data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getSidebar();
        if (cancelled) return;
        setSbar(data);

        // auto flip to "public" if private is totally empty
        const your = data.sections?.find((s) => s.key === "your");
        const total = (your?.groups ?? []).flatMap((g) => g.items ?? []).reduce((a, b) => a + (b.count ?? 0), 0);
        if (total === 0) setScope("public");
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // uptime
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setUptimeErr(null);
        const js = await fetchJSON(`${UPTIME_API}/v1/heartbeat/summary`, { cache: "no-store" });
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
    const k = scope === "public" ? "public" : "your";
    return sbar.sections.find((s) => s.key === k) || null;
  }, [sbar, scope]);

  // tiny helpers to pull counts from groups/items the API returns
  function findGroup(key) {
    if (!activeSection?.groups) return null;
    return activeSection.groups.find((g) => g.key === key) || null;
  }
  function countByKey(g, key, altKey) {
    if (!g?.items) return undefined;
    const it = g.items.find((x) => x.key === key || x.key === altKey);
    return typeof it?.count === "number" ? it.count : undefined;
  }

  const dashboardsGroup = useMemo(
    () => findGroup(scope === "public" ? "data_pub" : "data"),
    [activeSection, scope]
  );
  const variablesGroup = useMemo(
    () => findGroup(scope === "public" ? "data_pub" : "data"),
    [activeSection, scope]
  );
  const hardwareGroup = useMemo(() => {
    return (
      findGroup(scope === "public" ? "hardware_pub" : "hardware") ||
      findGroup(scope === "public" ? "hierarchy_pub" : "hierarchy")
    );
  }, [activeSection, scope]);
  const hierarchyGroup = useMemo(
    () => findGroup(scope === "public" ? "hierarchy_pub" : "hierarchy"),
    [activeSection, scope]
  );

  const hwCounts = useMemo(() => {
    const g = hardwareGroup;
    return {
      oracles: countByKey(g, scope === "public" ? "oracles_pub" : "oracles"),
      loggers: countByKey(g, scope === "public" ? "loggers_pub" : "loggers"),
      nodes: countByKey(g, scope === "public" ? "nodes_pub" : "nodes"),
    };
  }, [hardwareGroup, scope]);

  const dataCounts = useMemo(() => {
    const gD = dashboardsGroup;
    const gV = variablesGroup;
    const gH = hierarchyGroup;
    return {
      dashboards: countByKey(gD, scope === "public" ? "dashboards_pub" : "dashboards"),
      variables:
        countByKey(gV, scope === "public" ? "variables_pub" : "variables") ??
        countByKey(gH, scope === "public" ? "variables_pub2" : "variables_h"),
    };
  }, [dashboardsGroup, variablesGroup, hierarchyGroup, scope]);

  const hierCounts = useMemo(() => {
    const g = hierarchyGroup;
    return {
      companies: countByKey(g, scope === "public" ? "companies_pub" : "companies"),
      locations: countByKey(g, scope === "public" ? "locations_pub" : "locations"),
      fleets: countByKey(g, scope === "public" ? "fleets_pub" : "fleets"),
      assets: countByKey(g, scope === "public" ? "assets_pub" : "assets"),
      variables: countByKey(g, scope === "public" ? "variables_pub2" : "variables_h"),
    };
  }, [hierarchyGroup, scope]);

  const topDashboards = useMemo(() => {
    const tops = dashboardsGroup?.top?.dashboards || dashboardsGroup?.dashboards || [];
    return Array.isArray(tops) ? tops.slice(0, 5) : [];
  }, [dashboardsGroup]);

  const topVariables = useMemo(() => {
    const tops = variablesGroup?.top?.variables || variablesGroup?.variables || [];
    return Array.isArray(tops) ? tops.slice(0, 5) : [];
  }, [variablesGroup]);

  // when user clicks a list item, send the *whole* item (so it can include .ancestors)
  function handleItemSelect(item) {
    // TODO: route / filter / expand using item.ancestors if your API includes it
    // console.log("selected", item);
  }

  const scopeLabel = scope === "public" ? "Public Network" : "Your Network";

  const asideClasses = [
    "h-screen border-r text-foreground bg-[--color-sidebar] border-[--color-border] flex flex-col",
    collapsed ? "w-14 p-2" : "w-64 p-3",
  ].join(" ");

  // Brand row classes: center when collapsed, left-align when expanded
  const brandClasses = [
    "flex items-center",
    collapsed ? "justify-center h-11 -mx-2 px-2" : "justify-start h-11 -mx-3 pl-2 pr-3",
  ].join(" ");

  return (
    <aside className={asideClasses}>
      {/* Brand */}
<div className={brandClasses}>
<img src={collapsed ? "/favicon.png" : "/nsn1_md.png"} alt="Logo" className={collapsed ? "h-8 w-8 -mt-0.5" : "h-10 w-auto -mt-0.5"} />
      </div>

      {/* User row (expanded) or compact controls (collapsed) */}
      {collapsed ? (
<div className="px-0 mt-2 mb-3 flex flex-col items-center justify-center gap-1">
          {/* Grouped scope toggle (vertical stack) */}
          <div className="inline-flex flex-col rounded-md bg-muted p-0.5">
            <button
              type="button"
              title="Your Network"
              aria-label="Your Network"
              aria-pressed={scope === "your"}
              onClick={() => setScope("your")}
              className={[
                "appearance-none border-0 outline-none px-2 py-1 rounded",
scope === "your" ? "bg-background text-foreground" : "text-muted-foreground/70 hover:bg-background/50",
              ].join(" ")}
            >
              <FaUser />
            </button>
            <button
              type="button"
              title="Public Network"
              aria-label="Public Network"
              aria-pressed={scope === "public"}
              onClick={() => setScope("public")}
              className={[
                "appearance-none border-0 outline-none px-2 py-1 rounded mt-0.5",
scope === "public" ? "bg-background text-foreground" : "text-muted-foreground/70 hover:bg-background/50",
              ].join(" ")}
            >
              <FaGlobe />
            </button>
          </div>
        </div>
      ) : (
      <div className="px-0 mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2 truncate">
          <FaUser className="opacity-80" />
          <span className="truncate">{user?.email || user?.sub || "Not signed in"}</span>
        </div>
        <button className="ml-2 px-2 py-1 text-[11px] rounded border border-[--color-border] hover:bg-muted" onClick={() => onSettings?.()}>Settings</button>
        <button className="ml-2 px-2 py-1 text-[11px] rounded border border-[--color-border] hover:bg-muted" onClick={onLogout}>Logout</button>
      </div>
      )}

      {/* Scope switcher */}
      {!collapsed && (
<div className="px-0 mt-1 mb-3">
        <div className="inline-flex w-full rounded-md bg-background border border-[--color-border] overflow-hidden" role="tablist" aria-label="Scope">
          <button
            type="button"
            role="tab"
            aria-selected={scope === "your"}
            className={[
              "flex-1 px-3 py-1.5 text-xs flex items-center justify-center gap-1",
scope === "your" ? "bg-muted text-foreground" : "text-muted-foreground/70 hover:bg-muted/50",
            ].join(" ")}
            onClick={() => setScope("your")}
            title="Your Network"
          >
            <FaUser className="opacity-80" />
            <span>Your</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={scope === "public"}
            className={[
              "flex-1 px-3 py-2 text-xs flex items-center justify-center gap-1",
scope === "public" ? "bg-muted text-foreground" : "text-muted-foreground/70 hover:bg-muted/50",
            ].join(" ")}
            onClick={() => setScope("public")}
            title="Public Network"
          >
            <FaGlobe className="opacity-80" />
            <span>Public</span>
          </button>
        </div>
      </div>
      )}
      {!collapsed && (
      <div className="px-0 mt-1 mb-2 text-xs uppercase font-medium text-muted-foreground">
        {scope === "public" ? "Public Network" : "Your Network"}
      </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="text-sm text-destructive px-2 py-1 border rounded">
            Failed to load sidebar: {String(error)}
          </div>
        )}
        {loading && <div className="text-sm text-muted-foreground px-2 py-1">Loading…</div>}

        {/* Dashboards */}
        <Collapsible
          id="dashboards"
          icon={FaChartBar}
          label="Dashboards"
          startOpen={open.dashboards}
          onToggle={(v) => setOpen((p) => ({ ...p, dashboards: v }))}
          collapsed={collapsed}
        >
          <ItemRow label="All" count={dataCounts.dashboards} icon={FaListUl} onClick={handleItemSelect} />
          {topDashboards.length > 0 && (
            <div className="mt-1 ml-1">
              {topDashboards.map((d, i) => (
                <ItemRow
                  key={d.id || d.DID || d.name || i}
                  item={d}
                  label={d.name || d.Name || `Dashboard ${i + 1}`}
                  onClick={handleItemSelect}
                />
              ))}
            </div>
          )}
        </Collapsible>

        {/* Hardware */}
        <Collapsible
          id="hardware"
          icon={FaDatabase}
          label="Hardware"
          startOpen={open.hardware}
          onToggle={(v) => setOpen((p) => ({ ...p, hardware: v }))}
          collapsed={collapsed}
        >
          <ItemRow label="Oracles" count={hwCounts.oracles} icon={FaLink} onClick={handleItemSelect} />
          <ItemRow label="Loggers" count={hwCounts.loggers} icon={FaWifi} onClick={handleItemSelect} />
          <ItemRow label="Nodes" count={hwCounts.nodes} icon={FaServer} onClick={handleItemSelect} />
        </Collapsible>

        {/* Variables */}
        <Collapsible
          id="variables"
          icon={FaListUl}
          label="Variables"
          startOpen={open.variables}
          onToggle={(v) => setOpen((p) => ({ ...p, variables: v }))}
          collapsed={collapsed}
        >
          <ItemRow label="All" count={dataCounts.variables} icon={FaSlidersH} onClick={handleItemSelect} />
          {topVariables.length > 0 && (
            <div className="mt-1 ml-1">
              {topVariables.map((v, i) => (
                <ItemRow
                  key={v.id || v.VID || v.name || i}
                  item={v}
                  label={v.name || v.VarName || `Variable ${i + 1}`}
                  icon={FaSlidersH}
                  onClick={handleItemSelect}
                />
              ))}
            </div>
          )}
        </Collapsible>

        {/* Hierarchy */}
        <Collapsible
          id="hierarchy"
          icon={FaSitemap}
          label="Hierarchy"
          startOpen={open.hierarchy}
          onToggle={(v) => setOpen((p) => ({ ...p, hierarchy: v }))}
          collapsed={collapsed}
        >
          <ItemRow label="Companies" count={hierCounts.companies} icon={FaBuilding} onClick={handleItemSelect} />
          <ItemRow label="Locations" count={hierCounts.locations} icon={FaMapMarkerAlt} onClick={handleItemSelect} />
          <ItemRow label="Fleets" count={hierCounts.fleets} icon={FaTruck} onClick={handleItemSelect} />
          <ItemRow label="Assets" count={hierCounts.assets} icon={FaBoxes} onClick={handleItemSelect} />
          <ItemRow label="Variables" count={hierCounts.variables} icon={FaSlidersH} onClick={handleItemSelect} />
        </Collapsible>
      </div>

      {/* Collapsed: user actions at bottom */}
{collapsed && (
        <div className="px-0 mb-2 flex flex-col items-center justify-center gap-2">
          <button
            type="button"
            title="Settings"
            aria-label="Settings"
            onClick={() => onSettings?.()}
            className="appearance-none border-0 outline-none p-1.5 rounded text-muted-foreground hover:bg-muted/50"
          >
            <FaCog />
          </button>
          <button
            type="button"
            title="Logout"
            aria-label="Logout"
            onClick={onLogout}
            className="appearance-none border-0 outline-none p-1.5 rounded text-muted-foreground hover:bg-muted/50"
          >
            <FaSignOutAlt />
          </button>
        </div>
      )}

      {/* Bottom status strip */}
      <div className="mt-2 pt-2 border-t border-[--color-border] -mx-3 px-3">
        {collapsed ? (
          <div className="grid grid-rows-3 gap-1 text-center">
<div className="text-[10px] flex items-center justify-center gap-[4px]">
              <span className={["inline-block h-2 w-2 rounded-full",
                (uptime?.counts?.node?.online ?? 0) > 0 ? "bg-green-500" : "bg-red-500"].join(" ")}></span>
              <span className={(uptime?.counts?.node?.online ?? 0) > 0 ? "text-green-600" : "text-red-600"}>
{(uptime?.counts?.node?.online ?? 0) > 0 ? 'UP' : 'DN'}
              </span>
            </div>
            <div className={["text-[10px] font-semibold flex items-center justify-center gap-1", loggerColor].join(" ")}>
              <span className={["inline-block h-2 w-2 rounded-full", loggerDotClass].join(" ")}></span>
<span className="tracking-[0.04em]">{logOnline}/{logTotal}</span>
            </div>
            <div className="text-[10px] flex items-center justify-center gap-[2px]">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500"></span>
              <span className="text-green-600">UP</span>
            </div>
          </div>
        ) : (
          <>
            <div className="text-xs uppercase font-medium text-muted-foreground mb-1">Network Status</div>
            {uptimeErr && (
              <div className="py-1 text-sm text-muted-foreground italic">Network unavailable</div>
            )}
            {!uptimeErr && (
              <div className="grid grid-cols-3 gap-2 text-center">
                {/* Nodes */}
                <div className="rounded-lg bg-background border border-[--color-border] p-3 min-h-16 flex flex-col items-center justify-center">
                  <div className="text-[10px] uppercase text-muted-foreground">Nodes</div>
                  <div className={[
"mt-1 text-sm flex items-center justify-center gap-[4px]",
                (uptime?.counts?.node?.online ?? 0) > 0
                  ? "text-green-600 font-semibold"
                  : "text-red-600 font-semibold",
                  ].join(" ")}>
                    <span className={["inline-block h-2 w-2 rounded-full",
                      (uptime?.counts?.node?.online ?? 0) > 0 ? "bg-green-500" : "bg-red-500"].join(" ")}></span>
{(uptime?.counts?.node?.online ?? 0) > 0 ? 'UP' : 'DN'}
                  </div>
                </div>
                {/* Loggers (kept as count, centered in the middle) */}
                <div className="rounded-lg bg-background border border-[--color-border] p-3 min-h-16 flex flex-col items-center justify-center">
                  <div className="text-[10px] uppercase text-muted-foreground">Loggers</div>
                  <div className={["mt-1 text-sm font-semibold flex items-center gap-2", loggerColor].join(" ")}>
                    <span className={["inline-block h-2 w-2 rounded-full", loggerDotClass].join(" ")}></span>
<span className="tracking-[0.04em]">{logOnline}/{logTotal}</span>
                  </div>
                </div>
                {/* Oracles */}
                <div className="rounded-lg bg-background border border-[--color-border] p-3 min-h-16 flex flex-col items-center justify-center">
                  <div className="text-[10px] uppercase text-muted-foreground">Oracles</div>
                  <div className="mt-1 text-sm font-semibold flex items-center justify-center gap-2 text-green-600">
                    <span className="inline-block h-2 w-2 rounded-full bg-green-500"></span>
                    UP
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

    </aside>
  );
}
