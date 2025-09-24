// src/components/layout/Sidebar.jsx
import {
  FaChevronDown,
  FaChevronUp,
  FaChevronLeft,
  FaDatabase,
  FaWifi,
  FaLink,
  FaServer,
  FaHome,
  FaListUl,
  FaSlidersH,
  FaSitemap,
  FaBuilding,
  FaMapMarkerAlt,
  FaTruck,
  FaBoxes,
  FaLock,
  FaUser
} from "react-icons/fa";
import { useEffect, useMemo, useState } from "react";
import classNames from "classnames";

const ICONS = {
  Home: FaHome,
  LayoutDashboard: FaListUl,
  Sliders: FaSlidersH,
  Building2: FaBuilding,
  MapPin: FaMapMarkerAlt,
  Truck: FaTruck,
  Boxes: FaBoxes,
  Database: FaDatabase,
  Wifi: FaWifi,
  Link: FaLink,
  Server: FaServer,
};

function ItemRow({ item, collapsed, onShowTop5, scope }) {
  const Icon = ICONS[item.icon] || FaListUl;
  const showable = item.key.includes("dashboards") || item.key.includes("variables");
  const count = item.count ?? 0;
  const disabled = item.disabled || count === 0;

  return (
    <div
      className={classNames(
        "flex items-center justify-between px-3 py-2 rounded-md text-sm",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-muted transition"
      )}
      onClick={() => {
        if (!disabled && showable) onShowTop5?.(item);
      }}
    >
      <span className="flex items-center gap-2">
        <Icon />
        {!collapsed && item.label}
      </span>
      {!collapsed && (
        <div className="flex items-center gap-2">
          {count !== undefined && <span className="text-xs text-muted-foreground">{count}</span>}
          {showable && count > 0 && (
            <button
              className="text-[11px] px-2 py-0.5 rounded border border-[--color-border] hover:bg-background"
              onClick={(e) => {
                e.stopPropagation();
                onShowTop5?.(item);
              }}
            >
              Show
            </button>
          )}
          {disabled && <FaLock className="text-muted-foreground" />}
        </div>
      )}
    </div>
  );
}

function GroupBlock({ group, collapsed, expanded, toggleGroup, onShowTop5, scope }) {
  const hasItems = (group.items || []).length > 0;
  const GroupIcon = group.icon ? (ICONS[group.icon] || FaDatabase) : null;

  return (
    <div className={classNames("mb-4", collapsed && "text-center")}>
      <div
        className={classNames(
          "flex items-center justify-between px-2 py-2 rounded-md",
          hasItems ? "cursor-pointer hover:bg-muted transition" : ""
        )}
        onClick={() => hasItems && toggleGroup(group.key)}
      >
        <div className="flex items-center gap-2 text-xs uppercase font-medium text-muted-foreground">
          {GroupIcon && <GroupIcon className="opacity-70" />}
          {!collapsed && group.label}
        </div>
        {!collapsed && hasItems && (expanded ? <FaChevronUp /> : <FaChevronDown />)}
      </div>

      {!collapsed && expanded && hasItems && (
        <ul className="mt-1 space-y-1">
          {group.items.map((it) => (
            <li key={it.key}>
              <ItemRow item={it} collapsed={collapsed} onShowTop5={onShowTop5} scope={scope} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Divider() {
  return <div className="my-3 border-t border-[--color-border] opacity-70" />;
}

export default function Sidebar({ collapsed = false, sidebar, onScopeChange, scope = "your" }) {
  const [openGroups, setOpenGroups] = useState({
    ynHome: true, ynDashboards: true, ynHardware: true, ynVariables: true, ynHierarchy: true,
    pnHome: true, pnDashboards: true, pnHardware: true, pnVariables: true, pnHierarchy: true,
  });

  const [drawer, setDrawer] = useState({ kind: null, items: [], total: 0 });

  // When scope changes externally, close any drawer
  useEffect(() => { setDrawer({ kind: null, items: [], total: 0 }); }, [scope]);

  const currentSection = useMemo(() => {
    if (!sidebar?.sections) return null;
    const key = scope === "public" ? "public" : "your";
    return sidebar.sections.find((s) => s.key === key) || null;
  }, [sidebar, scope]);

  const toggleGroup = (k) => setOpenGroups((p) => ({ ...p, [k]: !p[k] }));

  async function loadTop5(kind) {
    try {
      const qp = new URLSearchParams({ kind, scope, limit: "5" }).toString();
      const res = await fetch(`/api/list?${qp}`);
      const json = await res.json();
      setDrawer({ kind, items: json.items || [], total: json.total || 0 });
    } catch (e) {
      console.error(e);
      setDrawer({ kind, items: [], total: 0 });
    }
  }

  function handleShowTop5(item) {
    if (item.key.includes("dashboards")) return loadTop5("dashboards");
    if (item.key.includes("variables"))  return loadTop5("variables");
  }

  // Scope dropdown
  const scopeLabel = scope === "public" ? "Public Network" : "Your Network";

  return (
    <aside className={classNames(
      "h-screen border-r text-foreground p-3 transition-all flex flex-col",
      collapsed ? "w-16" : "w-72",
      "bg-[--color-sidebar] border-[--color-border]"
    )}>
      {/* Logo / top */}
      <div className="flex items-center justify-between mb-3 px-1 shrink-0">
        {!collapsed && <img src="/nsn1_md.png" alt="Logo" className="h-10 w-auto" />}
        {collapsed && <img src="/favicon.png" alt="favicon" className="h-auto w-auto pt-1" />}
      </div>

      {/* Scope switcher with divider above/below */}
      <Divider />
      <div className={classNames("px-1 mb-2", collapsed && "text-center")}>
        <details className="group">
          <summary className="flex items-center justify-between cursor-pointer text-sm px-2 py-2 rounded-md hover:bg-muted">
            <span>{scopeLabel}</span>
            <FaChevronDown className="transition-transform group-open:rotate-180" />
          </summary>
          {!collapsed && (
            <div className="mt-2 space-y-1 text-sm">
              <button
                className={classNames(
                  "w-full text-left px-2 py-1 rounded hover:bg-muted",
                  scope === "your" && "bg-muted"
                )}
                onClick={() => onScopeChange?.("your")}
              >Your Network</button>
              <button
                className={classNames(
                  "w-full text-left px-2 py-1 rounded hover:bg-muted",
                  scope === "public" && "bg-muted"
                )}
                onClick={() => onScopeChange?.("public")}
              >Public Network</button>
            </div>
          )}
        </details>
      </div>
      <Divider />

      {/* Groups */}
      <div className="flex-1 overflow-y-auto">
        {currentSection?.groups?.map((g) => (
          <GroupBlock
            key={g.key}
            group={g}
            collapsed={collapsed}
            expanded={openGroups[g.key]}
            toggleGroup={toggleGroup}
            onShowTop5={handleShowTop5}
            scope={scope}
          />
        ))}

        {/* Drawer for top-5 lists */}
        {!collapsed && drawer.kind && (
          <div className="mt-2 mx-2 rounded-lg border border-[--color-border] bg-background">
            <div className="px-3 py-2 text-xs uppercase font-medium text-muted-foreground border-b border-[--color-border]">
              Top {Math.min(5, drawer.total)} {drawer.kind}
              {drawer.total > 5 && <span className="ml-2 normal-case text-[11px] text-muted-foreground">(+{drawer.total - 5} more)</span>}
            </div>
            <ul className="p-2 text-sm">
              {(drawer.items || []).map((it) => (
                <li key={it.id} className="px-2 py-1 rounded hover:bg-muted cursor-pointer">{it.name}</li>
              ))}
              {drawer.total === 0 && <li className="px-2 py-1 text-muted-foreground">None found</li>}
            </ul>
          </div>
        )}
      </div>

      {/* Bottom metrics panel */}
      <div className="mt-3 shrink-0">
        <Divider />
        {!collapsed && (
          <div className="px-2 py-2">
            <p className="text-xs uppercase font-medium text-muted-foreground mb-2">Live Hardware</p>
            <div className="grid grid-cols-3 gap-2">
              {/* Nodes */}
              <div className="rounded-lg border border-[--color-border] bg-background p-2 text-center">
                <div className="flex items-center justify-center gap-1 text-sm"><FaServer /> Nodes</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {sidebar?.metrics?.online?.nodes ?? "—"}<span className="mx-1">/</span>{sidebar?.metrics?.totals?.nodes ?? 0}
                </div>
              </div>
              {/* Oracles */}
              <div className="rounded-lg border border-[--color-border] bg-background p-2 text-center">
                <div className="flex items-center justify-center gap-1 text-sm"><FaLink /> Oracles</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {sidebar?.metrics?.online?.oracles ?? "—"}<span className="mx-1">/</span>{sidebar?.metrics?.totals?.oracles ?? 0}
                </div>
              </div>
              {/* Loggers */}
              <div className="rounded-lg border border-[--color-border] bg-background p-2 text-center">
                <div className="flex items-center justify-center gap-1 text-sm"><FaWifi /> Loggers</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {sidebar?.metrics?.online?.loggers ?? "—"}<span className="mx-1">/</span>{sidebar?.metrics?.totals?.loggers ?? 0}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User bar */}
        <div className="px-3 py-3 text-sm text-muted-foreground border-t border-[--color-border]">
          <div className="flex items-center gap-2">
            <FaUser />
            {!collapsed && <span>Signed in</span>}
          </div>
        </div>
      </div>
    </aside>
  );
}
