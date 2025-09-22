// src/App.jsx
import { useEffect, useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import "./index.css";

// ---- Env + mode switch
const AUTH_DISABLED = import.meta.env.VITE_AUTH_DISABLED === "true"; // dev=true, prod=false
const API_BASE      = import.meta.env.VITE_API_BASE || "/api";
const DEV_UID       = String(import.meta.env.VITE_FAKE_UID || "dev");

// Auth0 (used only when AUTH_DISABLED === false)
const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID;
const AUTH0_DOMAIN    = import.meta.env.VITE_AUTH0_DOMAIN;
const AUTH0_AUDIENCE  = import.meta.env.VITE_AUTH0_AUDIENCE;
const DASHBOARD_URL   = import.meta.env.VITE_DASHBOARD_URL || window.location.origin;

// --- Shared fetch helper: uses x-dev-uid in dev, Bearer token in prod
async function fetchJSON(path, token = "") {
  const headers = {};
  if (AUTH_DISABLED) {
    headers["x-dev-uid"] = DEV_UID;
  } else if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

// --- Auth0 helpers (only used in prod)
function extractTokenFromHash() {
  const hash = window.location.hash.slice(1);
  if (!hash) return null;
  const p = new URLSearchParams(hash);
  const access = p.get("access_token");
  const id = p.get("id_token");
  if (access && id) {
    localStorage.setItem("access_token", access);
    localStorage.setItem("id_token", id);
    window.history.replaceState({}, document.title, "/");
    return access;
  }
  return null;
}

function redirectToAuth() {
  const url = new URL(`https://${AUTH0_DOMAIN}/authorize`);
  url.searchParams.set("response_type", "token id_token");
  url.searchParams.set("client_id", AUTH0_CLIENT_ID || "");
  url.searchParams.set("redirect_uri", DASHBOARD_URL);
  url.searchParams.set("scope", "openid profile email");
  url.searchParams.set("audience", AUTH0_AUDIENCE || "");
  url.searchParams.set("nonce", "abc123");
  window.location.href = url.toString();
}

function logout() {
  if (AUTH_DISABLED) {
    localStorage.clear();
    window.location.reload();
  } else {
    localStorage.clear();
    const url = new URL(`https://${AUTH0_DOMAIN}/v2/logout`);
    url.searchParams.set("client_id", AUTH0_CLIENT_ID || "");
    url.searchParams.set("returnTo", DASHBOARD_URL);
    window.location.href = url.toString();
  }
}

export default function App() {
  const [user, setUser] = useState(null);
  const [dashboards, setDashboards] = useState([]);
  const [sidebar, setSidebar] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        let token = "";

        // Prod path: ensure we have a token (implicit flow)
        if (!AUTH_DISABLED) {
          token = extractTokenFromHash() || localStorage.getItem("access_token") || "";
          if (!token) {
            redirectToAuth();
            return; // stop here; we’ll come back with a token
          }
        }

        // One codepath for data in BOTH modes: hit Pages Functions
        // Dev sends x-dev-uid; Prod sends Bearer token (middleware verifies)
        const [userinfo, sbar] = await Promise.all([
          fetchJSON("/userinfo", token), // expect { user, dashboards }
          fetchJSON("/sidebar", token),  // your permission/public counts
        ]);

        setUser(userinfo?.user ?? (AUTH_DISABLED ? { sub: DEV_UID } : null));
        setDashboards(userinfo?.dashboards ?? []);
        setSidebar(sbar ?? null);
      } catch (e) {
        console.error(e);
        if (AUTH_DISABLED) {
          setUser({ sub: DEV_UID }); setDashboards([]); setSidebar(null);
        } else {
          logout();
          return;
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <MainLayout user={user} dashboards={dashboards} sidebar={sidebar} onLogout={logout}>
      <h2 className="text-xl font-semibold mb-2">Dashboard Overview</h2>
      <p className="text-muted-foreground">Select a Grafana dashboard from the sidebar to begin.</p>
    </MainLayout>
  );
}

