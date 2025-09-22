export function Input({ className = "", ...props }) {
  return (
    <input
      className={`border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black ${className}`}
      {...props}
    />
  )
}
