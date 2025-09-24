import React, { useEffect, useMemo, useRef, useState } from "react";
import UptimeCard from "./UptimeCard";
import { fetchUptimeHealth, fetchUptimeStatus } from "@/lib/uptime";

const LS_KEY = "uptime_oids";

export default function UptimePanel({ defaultOids = [] }) {
  const [oids, setOids] = useState(() => {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) return saved.split(",").map(s => s.trim()).filter(Boolean);
    if (defaultOids?.length) return defaultOids;
    return [];
  });
  const [items, setItems] = useState([]);
  const [healthOk, setHealthOk] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const timerRef = useRef(null);

  const textValue = useMemo(() => oids.join(","), [oids]);

  async function refresh() {
    setErr("");
    setLoading(true);
    try {
      const data = await fetchUptimeStatus(oids, "full");
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setErr(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  function setFromInput(v) {
    const list = (v || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
    setOids(list);
    localStorage.setItem(LS_KEY, list.join(","));
  }

  useEffect(() => {
    fetchUptimeHealth().then(setHealthOk).catch(() => setHealthOk(false));
  }, []);

  useEffect(() => {
    if (!oids.length) { setItems([]); return; }
    refresh();
    clearInterval(timerRef.current);
    timerRef.current = setInterval(refresh, 15000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oids.join(",")]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
        <div className="flex-1">
          <label className="block text-sm text-gray-600 mb-1">OIDs (comma-separated)</label>
          <input
            className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400"
            placeholder="oid1,oid2,oid3"
            value={textValue}
            onChange={e => setFromInput(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={refresh}
            className="rounded-xl border px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
            disabled={!oids.length || loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <span className={`self-center text-xs px-2 py-1 rounded-full border ${
            healthOk === null ? "opacity-60" :
            healthOk ? "bg-green-500/20 text-green-700 border-green-500/40" :
                       "bg-red-500/20 text-red-700 border-red-500/40"
          }`}>
            API {healthOk === null ? "…" : healthOk ? "healthy" : "down"}
          </span>
        </div>
      </div>

      {!oids.length && (
        <div className="text-sm text-gray-500">Enter one or more OIDs to begin.</div>
      )}

      {err && (
        <div className="text-sm text-red-600">Error: {err}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {items.map((it) => (
          <UptimeCard key={it.oid} item={it} />
        ))}
      </div>
    </div>
  );
}
