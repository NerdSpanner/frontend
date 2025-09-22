import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import Headerbar from "@/components/layout/Headerbar";

export default function MainLayout({ user, dashboards, children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar collapsed={sidebarCollapsed} />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)} />

        <div className="flex-1 overflow-y-auto p-6 bg-background">
          {children}
        </div>
      </div>
    </div>
  );
}
