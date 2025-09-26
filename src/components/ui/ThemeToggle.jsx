import { useEffect, useState } from "react"

export function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const classList = document.documentElement.classList
    dark ? classList.add("dark") : classList.remove("dark")
  }, [dark])

  return (
    <button
      type="button"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className={[
        "inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md border",
        "border-border bg-card text-foreground hover:bg-muted transition-colors"
      ].join(" ")}
      onClick={() => setDark((prev) => !prev)}
    >
      <span>{dark ? "🌙" : "☀️"}</span>
      <span className="hidden sm:inline">{dark ? "Dark" : "Light"}</span>
    </button>
  )
}
