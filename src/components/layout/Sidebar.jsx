// Sidebar.jsx
//
// This component renders a sidebar that can display either static
// placeholder sections or dynamically rendered sections fetched from
// the API (via the `sidebarData` prop). It also displays
// information about the logged‑in user and provides a logout action.

import { useState } from "react";
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

/**
 * SidebarSection renders a single section of the sidebar. Each section has
 * a title and a list of groups. Groups may contain nested items. When
 * collapsed, only icons or titles are visible. The `expanded` state
 * controls which groups are expanded or collapsed.
 */
function SidebarSection({ title, groups, collapsed, expanded, toggle }) {
  return (
    <div className={classNames("mb-4", collapsed && "text-center")}> 
      <p
        className={classNames(
          "text-xs uppercase font-medium text-muted-foreground px-2 mb-1",
          collapsed && "hidden"
        )}
      >
        {title}
      </p>
      {groups.map(({ key, label, items }) => (
        <div key={key}>
          <div
            className="flex items-center justify-between px-3 py-2 rounded-md cursor-pointer hover:bg-muted transition text-sm"
            onClick={() => toggle(key)}
          >
            <span className="flex items-center gap-2">
              {!collapsed && label}
            </span>
            {/* Expand/collapse chevron */}
            {!collapsed && items && (expanded[key] ? <FaChevronUp /> : <FaChevronDown />)}
          </div>
          {!collapsed && expanded[key] && items && (
            <ul className="ml-8 mt-1 space-y-1 text-sm text-muted-foreground">
              {items.map(({ key: itemKey, label: itemLabel, count, disabled, icon }) => {
                // Dynamically resolve Lucide icons by name. If no icon is found, omit it.
                const IconComponent = icon && LucideIcons[icon] ? LucideIcons[icon] : null;
                return (
                  <li
                    key={itemKey}
                    className={classNames(
                      "cursor-pointer hover:text-foreground flex justify-between items-center",
                      disabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {IconComponent && <IconComponent size={16} />}
                      {itemLabel}
                    </span>
                    {typeof count !== "undefined" && (
                      <span className="text-xs">{count}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Sidebar component
 *
 * Props:
 * - collapsed: boolean controlling whether the sidebar is collapsed
 * - user: the currently authenticated user (object with name, email, picture)
 * - dashboards: array of dashboard descriptors (unused here but passed for future use)
 * - sidebarData: dynamic sidebar structure from API; if null, static data is used
 * - onLogout: callback to handle logging the user out
 */
export default function Sidebar({
  collapsed = false,
  user,
  dashboards = [],
  sidebarData = null,
  onLogout,
}) {
  // Initialize expanded state for each group key when dynamic data is provided.
  const initialExpanded = {};
  if (sidebarData && sidebarData.sections) {
    sidebarData.sections.forEach((section) => {
      section.groups.forEach((group) => {
        initialExpanded[group.key] = false;
      });
    });
  }
  const [expanded, setExpanded] = useState(initialExpanded);

  // Toggle the open/closed state for a given key.
  const toggle = (key) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  // Build sections: use dynamic sidebar data if available; else fallback to static definitions.
  const sections = sidebarData?.sections ?? [
    {
      key: "yn",
      label: "Your Network",
      groups: [
        {
          key: "ynData",
          label: "Data",
          items: [
            { key: "variables", label: "Variables", count: 2 },
            { key: "dashboards", label: "Dashboards", count: 4 },
            { key: "explorer", label: "Explorer" },
            { key: "download", label: "Download" },
          ],
        },
        {
          key: "ynHardware",
          label: "Hardware",
          items: [
            { key: "overview", label: "Overview" },
            { key: "oracles", label: "Oracles", count: 3 },
            { key: "loggers", label: "Loggers", count: 2 },
          ],
        },
        {
          key: "ynHierarchy",
          label: "Hierarchy",
          items: [
            { key: "companies", label: "Companies", count: 4 },
            { key: "locations", label: "Locations", count: 7 },
            { key: "fleets", label: "Fleets", count: null, disabled: true },
            { key: "assets", label: "Assets", count: 7 },
            { key: "variables_h", label: "Variables", count: 2 },
          ],
        },
      ],
    },
    {
      key: "pn",
      label: "Public Network",
      groups: [
        {
          key: "pnData",
          label: "Data",
          items: [
            { key: "variables_pub", label: "Variables", count: 0 },
            { key: "dashboards_pub", label: "Dashboards", count: 0 },
          ],
        },
        {
          key: "pnHierarchy",
          label: "Hierarchy",
          items: [
            { key: "companies_pub", label: "Companies", count: 0 },
            { key: "locations_pub", label: "Locations", count: 0 },
            { key: "fleets_pub", label: "Fleets", count: 0 },
            { key: "assets_pub", label: "Assets", count: 0 },
            { key: "variables_pub2", label: "Variables", count: 0 },
          ],
        },
      ],
    },
  ];

  return (
    <aside
      className={classNames(
        "h-screen border-r text-foreground p-3 transition-all flex flex-col",
        collapsed ? "w-16" : "w-64",
        "bg-[--color-sidebar] border-[--color-border]"
      )}
    >
      {/* Logo area: show large logo when expanded and favicon when collapsed */}
      <div className="flex items-center justify-between mb-4 px-1 shrink-0">
        {!collapsed && (
          <img src="/nsn1_md.png" alt="Logo" className="h-10 w-auto" />
        )}
        {collapsed && (
          <img src="/favicon.png" alt="favicon" className="h-auto w-auto pt-1" />
        )}
      </div>

      {/* Sidebar sections */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {sections.map((section) => (
          <SidebarSection
            key={section.key}
            title={section.label}
            groups={section.groups}
            collapsed={collapsed}
            expanded={expanded}
            toggle={toggle}
          />
        ))}
      </div>

      {/* User info / account actions */}
      <div className="mt-4 px-3 shrink-0 text-sm text-muted-foreground border-t pt-3 border-[--color-border]">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full">
              <div className="flex items-center justify-between cursor-pointer hover:bg-muted p-2 rounded-md transition">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.picture} alt={user.name} />
                    <AvatarFallback>
                      {user.name?.[0] || user.email?.[0] || "U"}
                    </AvatarFallback>
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