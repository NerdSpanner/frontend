import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

/**
 * MainLayout component wraps the application with a sidebar and topbar.
 * It accepts user, dashboards, sidebar, and onLogout props and passes
 * them down to the Sidebar. The sidebar’s collapsed state is managed
 * locally via a useState hook.
 */
export default function MainLayout({ user, dashboards, sidebar, onLogout, onSettings, children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        user={user}
        dashboards={dashboards}
        sidebarData={sidebar}
        onLogout={onLogout}
        onSettings={onSettings}
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar onToggleSidebar={() => setSidebarCollapsed(prev => !prev)} onSettings={onSettings} onLogout={onLogout} />
        <div className="flex-1 overflow-y-auto p-6 bg-background">
          {children}
        </div>
      </div>
    </div>
  );
}