import { useState } from "react"
import Sidebar from "../components/layout/Sidebar"
import Topbar from "../components/layout/Topbar"
import { StatTile } from "../components/ui/StatTile"
import { FaClock, FaServer, FaHdd } from "react-icons/fa"


export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex flex-col h-screen">
      <Topbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

<div className="flex flex-1 overflow-hidden">
  {/* Always visible on md+ screens */}
  <div className={`${sidebarOpen ? "block" : "hidden"} md:block w-64 h-full`}>
    <Sidebar onLinkClick={() => setSidebarOpen(false)} />
  </div>

  <main className="flex-1 bg-surface text-text p-8 space-y-8 overflow-y-auto">
    <header>
      <h1 className="text-4xl font-bold text-text dark:text-text">Your Assets</h1>
      <p className="text-text/70 dark:text-text/50">More stuff here</p>
    </header>

    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <StatTile title="Uptime" value="99.98%" icon={<FaClock />} />
      <StatTile title="Devices" value="14" icon={<FaServer />} />
      <StatTile title="Storage" value="48.3 GB" icon={<FaHdd />} />
    </section>
  </main>
</div>

    </div>
  )
}


