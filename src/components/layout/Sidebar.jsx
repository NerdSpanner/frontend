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
} from "react-icons/fa";
import { useEffect, useMemo, useState } from "react";

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
        "flex items-center justify-between px-3 py-2 rounded-md text-sm",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-muted transition",
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

function Collapsible({ id, icon: Icon, label, startOpen = false, onToggle, children }) {
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
    <div className="mb-2">
      <button
        type="button"
        className="w-full flex items-center justify-between px-2 py-2 rounded-md hover:bg-muted text-left"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={`collapsible-${id}`}
      >
        <span className="flex items-center gap-2">
          {Icon ? <Icon className="opacity-80" /> : null}
          <span className="text-sm">{label}</span>
        </span>
        {open ? <FaChevronUp /> : <FaChevronDown />}
      </button>

      {open && (
        <div id={`collapsible-${id}`} className="mt-1">
          {children}
        </div>
      )}
    </div>
  );
}

// --- main component -----------------------------------------------------------
export default function Sidebar() {
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

  // load sidebar data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchJSON("/sidebar");
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

  return (
    <aside className="w-64 h-screen border-r text-foreground p-3 bg-[--color-sidebar] border-[--color-border] flex flex-col">
      {/* Brand */}
      <div className="flex items-center justify-between mb-3 px-1">
        <img src="/nsn1_md.png" alt="Logo" className="h-10 w-auto" />
      </div>

      {/* Scope switcher */}
      <div className="px-1 mb-2">
        <div className="text-xs uppercase font-medium text-muted-foreground mb-1">Scope</div>
        <div className="grid grid-cols-2 gap-2">
          <button
            className={["px-2 py-1 rounded border", scope === "your" ? "bg-muted" : ""].join(" ")}
            onClick={() => setScope("your")}
            title="Your Network"
          >
            Your
          </button>
          <button
            className={["px-2 py-1 rounded border", scope === "public" ? "bg-muted" : ""].join(" ")}
            onClick={() => setScope("public")}
            title="Public Network"
          >
            Public
          </button>
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">{scopeLabel}</div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="text-sm text-destructive px-2 py-1 border rounded">
            Failed to load sidebar: {String(error)}
          </div>
        )}
        {loading && <div className="text-sm text-muted-foreground px-2 py-1">Loading…</div>}

        {/* Dashboards */}
        <SectionHeader>Dashboards</SectionHeader>
        <Collapsible
          id="dashboards"
          icon={FaDatabase}
          label="Dashboards"
          startOpen={open.dashboards}
          onToggle={(v) => setOpen((p) => ({ ...p, dashboards: v }))}
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
        <SectionHeader>Hardware</SectionHeader>
        <Collapsible
          id="hardware"
          icon={FaDatabase}
          label="Hardware"
          startOpen={open.hardware}
          onToggle={(v) => setOpen((p) => ({ ...p, hardware: v }))}
        >
          <ItemRow label="Oracles" count={hwCounts.oracles} icon={FaLink} onClick={handleItemSelect} />
          <ItemRow label="Loggers" count={hwCounts.loggers} icon={FaWifi} onClick={handleItemSelect} />
          <ItemRow label="Nodes" count={hwCounts.nodes} icon={FaServer} onClick={handleItemSelect} />
        </Collapsible>

        {/* Variables */}
        <SectionHeader>Variables</SectionHeader>
        <Collapsible
          id="variables"
          icon={FaListUl}
          label="Variables"
          startOpen={open.variables}
          onToggle={(v) => setOpen((p) => ({ ...p, variables: v }))}
        >
          <ItemRow label="All" count={dataCounts.variables} onClick={handleItemSelect} />
          {topVariables.length > 0 && (
            <div className="mt-1 ml-1">
              {topVariables.map((v, i) => (
                <ItemRow
                  key={v.id || v.VID || v.name || i}
                  item={v}
                  label={v.name || v.VarName || `Variable ${i + 1}`}
                  onClick={handleItemSelect}
                />
              ))}
            </div>
          )}
        </Collapsible>

        {/* Hierarchy */}
        <SectionHeader>Hierarchy</SectionHeader>
        <Collapsible
          id="hierarchy"
          icon={FaSitemap}
          label="Hierarchy"
          startOpen={open.hierarchy}
          onToggle={(v) => setOpen((p) => ({ ...p, hierarchy: v }))}
        >
          <ItemRow label="Companies" count={hierCounts.companies} onClick={handleItemSelect} />
          <ItemRow label="Locations" count={hierCounts.locations} onClick={handleItemSelect} />
          <ItemRow label="Fleets" count={hierCounts.fleets} onClick={handleItemSelect} />
          <ItemRow label="Assets" count={hierCounts.assets} onClick={handleItemSelect} />
          <ItemRow label="Variables" count={hierCounts.variables} onClick={handleItemSelect} />
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
              <div className="text-sm font-semibold">
                {uptime?.counts?.node?.online ?? 0} / {uptime?.counts?.node?.total ?? 0}
              </div>
            </div>
            <div className="rounded-lg bg-background border border-[--color-border] p-2">
              <div className="text-[10px] uppercase text-muted-foreground">Oracles</div>
              <div className="text-sm font-semibold">
                {uptime?.counts?.oracle?.online ?? 0} / {uptime?.counts?.oracle?.total ?? 0}
              </div>
            </div>
            <div className="rounded-lg bg-background border border-[--color-border] p-2">
              <div className="text-[10px] uppercase text-muted-foreground">Loggers</div>
              <div className="text-sm font-semibold">
                {uptime?.counts?.logger?.online ?? 0} / {uptime?.counts?.logger?.total ?? 0}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
