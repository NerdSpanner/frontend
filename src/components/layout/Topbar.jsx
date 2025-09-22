import { ThemeToggle } from "../ui/ThemeToggle"
import { FaBell, FaGripLines } from "react-icons/fa"

export default function Topbar({ onToggleSidebar }) {
  return (
    <header className="flex items-center justify-between px-6 py-2 bg-[--color-sidebar] border-b border-[--color-border] shadow-sm">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="text-text dark:text-gray-300"
        >
          <FaGripLines size={20} />
        </button>
        <input
          type="text"
          placeholder="Search..."
          className="hidden md:block px-3 py-2 text-sm rounded-md bg-sidebar/90 dark:bg-sidebar border border-border dark:border-border focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
        />
      </div>

      <div className="flex items-center gap-4">
        <button className="text-text dark:text-gray-300 hover:text-black dark:hover:text-text">
          <FaBell />
        </button>
        <ThemeToggle />
      </div>
    </header>
  )
}
