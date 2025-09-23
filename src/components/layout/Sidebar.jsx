// src/components/layout/Sidebar.jsx
import { useEffect, useMemo, useState } from "react";
import classNames from "classnames";
import * as LucideIcons from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FaChevronDown, FaChevronUp, FaUser } from "react-icons/fa";
import { Lock, Shield, Globe } from "lucide-react";

// ---- Dev/prod header helper (mirrors App.jsx behavior)
const AUTH_DISABLED = import.meta.env.VITE_AUTH_DISABLED === "true";
const DEV_UID       = String(import.meta.env.VITE_FAKE_UID || "dev");
const SCOPE_KEY     = "sidebarScope"; // 'private' | 'public'

async function fetchList({ kind, scope, limit = 5, offset = 0 }) {
  const qs = new URLSearchParams({
    kind: String(kind || ""),
    scope: String(scope || "your"),
    limit: String(limit),
    offset: String(offset),
  }).toString();
  const headers = {};
  if (AUTH_DISABLED) headers["x-dev-uid"] = DEV_UID;
  const res = await fetch(`/api/list?${qs}`, { headers });
  if (!res.ok) throw new Error(`/api/list ${res.status}`);
  return res.json(); // { total, items: [{id,name}] }
}

// ---- Helpers to enrich API sidebar sections with kind/scope
function inferKindFromKey(k = "", label = "") {
  const s = (k + " " + label).toLowerCase();
  if (s.includes("company"))  return "companies";
  if (s.includes("location")) return "locations";
  if (s.includes("fleet"))    return "fleets";
  if (s.includes("asset"))    return "assets";
  // Variables preview disabled to avoid confusion
  if (s.includes("variable")) return undefined;
  return undefined;
}
function inferScope(sectionKey = "", itemKey = "") {
  const a = (sectionKey || "").toLowerCase();
  const b = (itemKey || "").toLowerCase();
  if (a.includes("public") || b.endsWith("_pub") || b.includes("_pub")) return "public";
  return "your";
}

function normalizeSections(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map(sec => ({
    ...sec,
    groups: (sec.groups || []).map(g => ({
      ...g,
      items: (g.items || []).map(it => {
        const kind  = inferKindFromKey(it.key, it.label);
        const scope = inferScope(sec.key, it.key);
        // never disable fleets
        const disabled = it.key?.toLowerCase().includes("fleets") ? false : it.disabled;
        return { ...it, kind, scope, disabled };
      }),
    })),
  }));
}

// Ensure Public section has Data + Hardware groups (in addition to Hierarchy)
function augmentPublicGroups(sections) {
  return sections.map(sec => {
    const isPublic = String(sec.key).toLowerCase().includes("public");
    if (!isPublic) return sec;

    const groups = [...(sec.groups || [])];
    const hasData     = groups.some(g => (g.key || "").toLowerCase().includes("data"));
    const hasHardware = groups.some(g => (g.key || "").toLowerCase().includes("hardware"));

    if (!hasData) {
      groups.push({
        key: "pnData",
        label: "Data",
        items: [
          { key: "variables_pub",  label: "Variables",  count: 0, icon: "Sliders",         kind: undefined, scope: "public" },
          { key: "dashboards_pub", label: "Dashboards", count: 0, icon: "LayoutDashboard", kind: undefined, scope: "public" },
        ],
      });
    }
    if (!hasHardware) {
      groups.push({
        key: "pnHardware",
        label: "Hardware",
        items: [
          { key: "oracles_pub", label: "Oracles", count: 0, icon: "Antenna", kind: undefined, scope: "public" },
          { key: "loggers_pub", label: "Loggers", count: 0,                  kind: undefined, scope: "public" },
        ],
      });
    }
    return { ...sec, groups };
  });
}

// ---- Per-group / per-section helpers
function groupPrivateCount(group) {
  if (!group) return 0;
  return (group.items || []).reduce((acc, it) => {
    const isPrivate = (it.scope || "your") === "your";
    const n = Number.isFinite(Number(it.count)) ? Number(it.count) : 0;
    return acc + (isPrivate ? n : 0);
  }, 0);
}
function sectionPrivateCount(section) {
  if (!section) return 0;
  return (section.groups || []).reduce((acc, g) => acc + groupPrivateCount(g), 0);
}

// ---- Minified lock panel for a single private group (when counts=0)
function MinifiedLockedGroup({ collapsed, group }) {
  const items = (group?.items || []).map(it => ({
    key: it.key,
    label: it.label,
    icon: it.icon,
  }));
  return (
    <div
      className={classNames(
        "mx-3 my-2 rounded-md border border-[--color-border] bg-muted/40 px-2 py-2",
        collapsed && "mx-1 px-1"
      )}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <Lock size={14} />
        {!collapsed && <span>Locked — no private items yet</span>}
      </div>
      <div className={classNames("grid gap-1", collapsed ? "grid-cols-1" : "grid-cols-2")}>
        {items.map(({ key, label, icon }) => {
          const Icon = icon && LucideIcons[icon] ? LucideIcons[icon] : null;
          return (
            <div
              key={key}
              className={classNames(
                "flex items-center gap-2 text-xs rounded px-2 py-1",
                "opacity-60 cursor-not-allowed select-none"
              )}
              title={`${label} (locked)`}
            >
              {Icon && <Icon size={14} />}
              {!collapsed && <span className="truncate">{label}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Rows / Groups / Sections
function SidebarGroupRow({
  group,
  collapsed,
  expanded,
  toggle,
  renderItem,
  isYourSection,
  globalScope, // 'private' | 'public'
}) {
  // Only show the locked panel when we're in PRIVATE mode for "Your" section
  const showLockedPanel = isYourSection && globalScope === "private" && groupPrivateCount(group) === 0;

  return (
    <div>
      <div
        className="flex items-center justify-between px-3 py-2 rounded-md cursor-pointer hover:bg-muted transition text-sm"
        onClick={() => toggle(group.key)}
      >
        <span className="flex items-center gap-2">{!collapsed && group.label}</span>
        {!collapsed && (expanded[group.key] ? <FaChevronUp /> : <FaChevronDown />)}
      </div>

      {!collapsed && expanded[group.key] && (
        showLockedPanel ? (
          <MinifiedLockedGroup collapsed={collapsed} group={group} />
        ) : (
          <ul className="ml-8 mt-1 space-y-1 text-sm text-muted-foreground">
            {(group.items || []).map(it => renderItem(it, { isYourSection, globalScope }))}
          </ul>
        )
      )}
    </div>
  );
}

function SidebarSection({
  section,
  collapsed,
  expanded,
  toggle,
  renderItem,
  globalScope,
}) {
  const isYourSection = String(section.key).toLowerCase().includes("your");
  return (
    <div className={classNames("mb-4", collapsed && "text-center")}>
      <p className={classNames("text-xs uppercase font-medium text-muted-foreground px-2 mb-1", collapsed && "hidden")}>
        {section.label}
      </p>
      {(section.groups || []).map((g) => (
        <SidebarGroupRow
          key={g.key}
          group={g}
          collapsed={collapsed}
          expanded={expanded}
          toggle={toggle}
          renderItem={renderItem}
          isYourSection={isYourSection}
          globalScope={globalScope}
        />
      ))}
    </div>
  );
}

export default function Sidebar({
  collapsed = false,
  user,
  dashboards = [],
  sidebarData = null,
  onLogout,
}) {
  // expanded state (per group)
  const [expanded, setExpanded] = useState({});
  const toggle = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  // per-item preview cache
  const [itemOpen, setItemOpen] = useState({});   // key -> boolean
  const [itemData, setItemData] = useState({});   // cacheKey -> { items, total, scopeUsed, note }
  const setOpen  = (k, v) => setItemOpen(prev => ({ ...prev, [k]: v }));
  const setCache = (k, payload) => setItemData(prev => ({ ...prev, [k]: payload }));

  // sections from API or fallback; always augment public to include Data + Hardware
  const sections = useMemo(() => {
    let base;
    if (sidebarData?.sections) base = normalizeSections(sidebarData.sections);
    else {
      // static fallback with zeros
      base = normalizeSections([
        {
          key: "your",
          label: "Your Network",
          groups: [
            { key: "ynData", label: "Data", items: [
              { key: "variables",  label: "Variables",  count: 0, icon: "Sliders" },
              { key: "dashboards", label: "Dashboards", count: 0, icon: "LayoutDashboard" },
            ]},
            { key: "ynHardware", label: "Hardware", items: [
              { key: "oracles", label: "Oracles", count: 0, icon: "Antenna" },
            ]},
            { key: "ynHierarchy", label: "Hierarchy", items: [
              { key: "companies", label: "Companies", count: 0, icon: "Building2" },
              { key: "locations", label: "Locations", count: 0, icon: "MapPin" },
              { key: "fleets",    label: "Fleets",    count: 0, icon: "Truck" },
              { key: "assets",    label: "Assets",    count: 0, icon: "Boxes" },
            ]},
          ],
        },
        {
          key: "public",
          label: "Public Network",
          groups: [
            { key: "pnHierarchy", label: "Hierarchy", items: [
              { key: "companies_pub", label: "Companies", count: 0, icon: "Building2" },
              { key: "locations_pub", label: "Locations", count: 0, icon: "MapPin" },
              { key: "fleets_pub",    label: "Fleets",    count: 0, icon: "Truck" },
              { key: "assets_pub",    label: "Assets",    count: 0, icon: "Boxes" },
            ]},
          ],
        },
      ]);
    }
    return augmentPublicGroups(base);
  }, [sidebarData]);

  // Decide default global scope (private if any private counts > 0, else public).
  const yourSection = useMemo(
    () => sections.find(s => String(s.key).toLowerCase().includes("your")),
    [sections]
  );
  const hasAnyPrivate = sectionPrivateCount(yourSection) > 0;

  const [globalScope, setGlobalScope] = useState(() => {
    const saved = localStorage.getItem(SCOPE_KEY);
    if (saved === "private" || saved === "public") return saved;
    return "private"; // temp default; corrected below once counts known
  });

  useEffect(() => {
    // After sections/counters are known, set default if nothing saved
    const saved = localStorage.getItem(SCOPE_KEY);
    if (!saved) {
      const next = hasAnyPrivate ? "private" : "public";
      setGlobalScope(next);
      localStorage.setItem(SCOPE_KEY, next);
    }
  }, [hasAnyPrivate]);

  // initialize expanded groups on first load
  useEffect(() => {
    const init = {};
    sections.forEach(sec => (sec.groups || []).forEach(g => init[g.key] = init[g.key] ?? false));
    setExpanded(prev => Object.keys(init).length ? init : prev);
  }, [sections]);

  // Filter visible sections based on global scope
  const visibleSections = useMemo(() => {
    const wantPublic = globalScope === "public";
    return sections.filter(sec =>
      wantPublic
        ? String(sec.key).toLowerCase().includes("public")
        : String(sec.key).toLowerCase().includes("your")
    );
  }, [sections, globalScope]);

  // Item row renderer (uses globalScope for previews)
  const renderItem = (item, ctx) => {
    const { isYourSection } = ctx;
    const { key: itemKey, label, count, icon, disabled, kind } = item;

    const Icon = icon && LucideIcons[icon] ? LucideIcons[icon] : null;
    const open  = !!itemOpen[itemKey];
    const cacheKey = `${itemKey}:${globalScope}`;
    const view = itemData[cacheKey];

    // Show button when there is something to preview in current scope
    const numericCount = Number(count);
    const showButtonVisible =
      !!kind &&
      (
        (globalScope === "private" && numericCount > 0) ||
        (globalScope === "public") // public preview allowed regardless of private count
      );

    async function onToggleNames(e) {
      e.stopPropagation();
      if (!showButtonVisible) return;
      if (!open && !view) {
        try {
          const data = await fetchList({
            kind,
            scope: globalScope === "private" ? "your" : "public",
            limit: 5,
            offset: 0,
          });
          setCache(cacheKey, {
            items: data.items || [],
            total: Number(data.total || 0),
            scopeUsed: globalScope,
          });
        } catch {
          setCache(cacheKey, { items: [], total: 0, scopeUsed: globalScope, note: "Failed to load" });
        }
      }
      setOpen(itemKey, !open);
    }

    return (
      <li
        key={itemKey}
        className={classNames(
          "flex flex-col gap-1",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className="flex justify-between items-center cursor-pointer hover:text-foreground">
          <span className="flex items-center gap-2">
            {Icon && <Icon size={16} />}
            {label}
          </span>
          <div className="flex items-center gap-2">
            {typeof count !== "undefined" && (
              <span className="text-xs text-muted-foreground">{count}</span>
            )}
            {showButtonVisible ? (
              <button
                className="text-xs text-muted-foreground hover:underline"
                onClick={onToggleNames}
                title={globalScope === "public" ? "Previewing public items" : undefined}
              >
                {open ? "Hide" : "Show"}
              </button>
            ) : null}
          </div>
        </div>

        {open && showButtonVisible && (
          <div className="mt-1 ml-6">
            {!view ? (
              <div className="text-xs text-muted-foreground">Loading…</div>
            ) : (
              <>
                {view.note && (
                  <div className="text-[11px] text-muted-foreground mb-1">
                    {view.note}
                  </div>
                )}
                {view.items?.length ? (
                  <ul className="text-xs space-y-1">
                    {view.items.map(x => <li key={x.id} className="truncate">{x.name}</li>)}
                  </ul>
                ) : (
                  <div className="text-xs text-muted-foreground">No items.</div>
                )}
                {view.total > (view.items?.length || 0) && (
                  <div className="mt-1">
                    <a className="text-xs underline cursor-pointer">
                      See more…
                    </a>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </li>
    );
  };

  // ---- Global scope switch (top of sidebar)
  function ScopeSwitch() {
    const isPublic = globalScope === "public";
    return (
      <div className={classNames(
        "px-2 mb-3",
        collapsed && "px-0"
      )}>
        <div className={classNames(
          "inline-flex rounded-lg border border-[--color-border] overflow-hidden",
          collapsed ? "flex-col" : "flex-row"
        )}>
          <button
            className={classNames(
              "flex items-center gap-2 px-3 py-1.5 text-xs",
              !isPublic ? "bg-foreground text-background" : "bg-transparent text-foreground hover:bg-muted"
            )}
            onClick={() => { setGlobalScope("private"); localStorage.setItem(SCOPE_KEY, "private"); }}
            title="Show Your (private) items"
          >
            <Shield size={14} />
            {!collapsed && "Private"}
          </button>
          <button
            className={classNames(
              "flex items-center gap-2 px-3 py-1.5 text-xs",
              isPublic ? "bg-foreground text-background" : "bg-transparent text-foreground hover:bg-muted",
              collapsed ? "border-t border-[--color-border]" : "border-l border-[--color-border]"
            )}
            onClick={() => { setGlobalScope("public"); localStorage.setItem(SCOPE_KEY, "public"); }}
            title="Show Public items"
          >
            <Globe size={14} />
            {!collapsed && "Public"}
          </button>
        </div>
        {/* Small auto-default hint */}
        {!localStorage.getItem(SCOPE_KEY) && !hasAnyPrivate && (
          <div className="mt-1 text-[11px] text-muted-foreground">
            No private items found — defaulted to Public.
          </div>
        )}
      </div>
    );
  }

  return (
    <aside
      className={classNames(
        "h-screen border-r text-foreground p-3 transition-all flex flex-col",
        collapsed ? "w-16" : "w-64",
        "bg-[--color-sidebar] border-[--color-border]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between mb-3 px-1 shrink-0">
        {!collapsed && <img src="/nsn1_md.png" alt="Logo" className="h-10 w-auto" />}
        {collapsed && <img src="/favicon.png" alt="favicon" className="h-auto w-auto pt-1" />}
      </div>

      {/* Global scope switch */}
      <ScopeSwitch />

      {/* Sections (filtered by globalScope) */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {visibleSections.map(sec => (
          <SidebarSection
            key={sec.key}
            section={sec}
            collapsed={collapsed}
            expanded={expanded}
            toggle={toggle}
            renderItem={renderItem}
            globalScope={globalScope}
          />
        ))}
      </div>

      {/* User info + logout */}
      <div className="mt-4 px-3 shrink-0 text-sm text-muted-foreground border-t pt-3 border-[--color-border]">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full">
              <div className="flex items-center justify-between cursor-pointer hover:bg-muted p-2 rounded-md transition">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.picture} alt={user.name} />
                    <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col text-left">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <FaChevronDown className="text-muted-foreground" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full mt-1">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => alert("Profile clicked")}>Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => alert("Settings clicked")}>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2">
            <FaUser />
            {!collapsed && <span>Not logged in</span>}
          </div>
        )}
      </div>
    </aside>
  );
}

