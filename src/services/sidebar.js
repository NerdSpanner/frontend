const AUTH_DISABLED = import.meta.env.VITE_AUTH_DISABLED === "true";
const API_BASE = import.meta.env.VITE_API_BASE || "/api";
const FAKE_UID = String(import.meta.env.VITE_FAKE_UID || "dev");

export async function getSidebar() {
  const headers = {};
  if (AUTH_DISABLED) headers["x-dev-uid"] = FAKE_UID;
  const res = await fetch(`${API_BASE}/sidebar`, { headers });
  if (!res.ok) throw new Error("Sidebar fetch failed");
  return res.json();
}
