import { FaHome } from "react-icons/fa"

export default function Headerbar() {
  return (
    <header className="flex flex-col px-6 py-4 bg-white border-b border-[--color-border] shadow-sm">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
        <FaHome size={16} className="text-muted-foreground" />
        <span className="text-muted-foreground">Home / Dashboard</span>
      </div>
      <h1 className="text-xl font-semibold text-text">Dashboard Overview</h1>
      <p className="text-sm text-muted-foreground">Insights into your data, hardware, and relationships.</p>
    </header>
  )
}
