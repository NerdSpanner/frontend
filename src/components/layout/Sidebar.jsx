// Sidebar.jsx
import {
  FaChevronDown,
  FaChevronUp,
  FaChevronLeft,
  FaDatabase,
  FaMicrochip,
  FaProjectDiagram,
  FaBook,
  FaUser
} from "react-icons/fa";
import { useState } from "react";
import classNames from "classnames";

const SidebarSection = ({ title, sections, collapsed }) => {
  return (
    <div className={classNames("mb-4", collapsed && "text-center")}> 
      <p className={classNames("text-xs uppercase font-medium text-muted-foreground px-2 mb-1", collapsed && "hidden")}>{title}</p>
      {sections.map(({ id, label, icon: Icon, children, disabled, count, expanded, toggle }) => (
        <div key={id}>
          <div
            className={classNames(
              "flex items-center justify-between px-3 py-2 rounded-md cursor-pointer hover:bg-muted transition text-sm",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => !disabled && toggle(id)}
          >
            <span className="flex items-center gap-2">
              <Icon />
              {!collapsed && label}
            </span>
            {!collapsed && children && (expanded ? <FaChevronUp /> : <FaChevronDown />)}
          </div>
          {!collapsed && expanded && children && (
            <ul className="ml-8 mt-1 space-y-1 text-sm text-muted-foreground">
              {children.map(({ label, count, disabled }) => (
                <li
                  key={label}
                  className={classNames("cursor-pointer hover:text-foreground flex justify-between", disabled && "opacity-50 cursor-not-allowed")}
                >
                  <span>{label}</span>
                  {count !== undefined && <span className="text-xs">{count}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
};

export default function Sidebar({ collapsed, toggleCollapsed }) {
  const [expanded, setExpanded] = useState({
    ynData: true,
    ynHardware: true,
    ynHierarchy: true,
    pnData: false,
    pnHardware: false,
    pnHierarchy: false,
    resources: false
  });

  const toggle = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const sharedSections = (prefix) => [
    {
      id: `${prefix}Data`,
      label: "Data",
      icon: FaDatabase,
      expanded: expanded[`${prefix}Data`],
      toggle,
      children: [
        { label: "Variables", count: 2 },
        { label: "Dashboards", count: 4 },
        { label: "Explorer" },
        { label: "Download" }
      ]
    },
    {
      id: `${prefix}Hardware`,
      label: "Hardware",
      icon: FaMicrochip,
      expanded: expanded[`${prefix}Hardware`],
      toggle,
      children: [
        { label: "Overview" },
        { label: "Oracles", count: 3 },
        { label: "Loggers", count: 2 }
      ]
    },
    {
      id: `${prefix}Hierarchy`,
      label: "Hierarchy",
      icon: FaProjectDiagram,
      expanded: expanded[`${prefix}Hierarchy`],
      toggle,
      children: [
        { label: "Companies", count: 4 },
        { label: "Locations", count: 7 },
        { label: "Fleets", count: "-", disabled: true },
        { label: "Assets", count: 7 },
        { label: "Variables", count: 2 }
      ]
    }
  ];

  const resourceLinks = [
    { label: "Documentation", icon: FaBook }
  ];

  return (
    <aside className={classNames("h-screen border-r text-foreground p-3 transition-all flex flex-col", collapsed ? "w-16" : "w-64", "bg-[--color-sidebar] border-[--color-border]")}> 
      <div className="flex items-center justify-between mb-4 px-1 shrink-0">
        {!collapsed && <img src="/nsn1_md.png" alt="Logo" className="h-10 w-auto" />}
        {collapsed && <img src="/favicon.png" alt="favicon" className="h-auto w-auto pt-1" />}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        <SidebarSection title="Your Network" sections={sharedSections("yn")} collapsed={collapsed} />
        <SidebarSection title="Public Network" sections={sharedSections("pn")} collapsed={collapsed} />

        <div className={classNames("mb-4", collapsed && "text-center")}> 
          <p className={classNames("text-xs uppercase font-medium text-muted-foreground px-2 mb-1", collapsed && "hidden")}>Resources</p>
          <ul className="px-2 space-y-2">
            {resourceLinks.map(({ label, icon: Icon }) => (
              <li key={label} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer">
                <Icon /> {!collapsed && <span>{label}</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* User Section */}
      <div className="mt-4 px-3 shrink-0 text-sm text-muted-foreground border-t pt-3 border-[--color-border]">
        <div className="flex items-center gap-2">
          <FaUser />
          {!collapsed && <span>Logged in as Admin</span>}
        </div>
      </div>
    </aside>
  );
}
