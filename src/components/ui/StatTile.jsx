export function StatTile({ title, value, icon }) {
  return (
    <div className="bg-surface dark:bg-sidebar rounded-lg p-6 border border-border text-text dark:text-text flex items-center gap-4">
      <div className="text-3xl">{icon}</div>
      <div>
        <h2 className="text-sm text-text/70 dark:text-text/50">{title}</h2>
        <div className="text-xl font-semibold">{value}</div>
      </div>
    </div>
  )
}

