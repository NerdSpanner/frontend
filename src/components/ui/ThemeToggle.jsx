import { useEffect, useState } from "react"

export function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const classList = document.documentElement.classList
    dark ? classList.add("dark") : classList.remove("dark")
  }, [dark])

  return (
    <button
      className="bg-gray-300 dark:bg-gray-700 text-sm px-4 py-2 rounded"
      onClick={() => setDark((prev) => !prev)}
    >
      {dark ? "🌙 Dark" : "☀️ Light"}
    </button>
  )
}
