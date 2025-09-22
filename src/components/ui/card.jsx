export function Card({ title, children }) {
  return (
    <div className="bg-surface rounded-2xl shadow p-6">
      <h2 className="text-gray-700 font-medium mb-2">{title}</h2>
      <div className="text-text text-lg">{children}</div>
    </div>
  )
}
