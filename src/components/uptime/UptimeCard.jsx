import React from "react";
import { formatAgoFromEpochSeconds, stateBadgeColor } from "@/lib/uptime";

export default function UptimeCard({ item }) {
  const { oid, type, state, last_seen, latency_ms, stage } = item || {};
  const badge = stateBadgeColor(state);

  return (
    <div className="rounded-2xl border p-4 shadow-sm bg-white/70 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex h-2.5 w-2.5 rounded-full ${
            state?.toLowerCase() === "online" ? "bg-green-500" :
            state?.toLowerCase() === "offline" ? "bg-red-500" : "bg-gray-400"
          }`} />
          <span className="text-sm uppercase tracking-wide text-gray-600">{type || "unknown"}</span>
        </div>
        <span className={`px-2.5 py-1 text-xs border rounded-full font-medium ${badge}`}>
          {state || "unknown"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div className="space-y-1">
          <div className="text-gray-500">OID</div>
          <code className="block text-xs break-all text-gray-900">{oid || "—"}</code>
        </div>
        <div className="space-y-1">
          <div className="text-gray-500">Latency</div>
          <div className="text-gray-900">{latency_ms != null ? `${latency_ms} ms` : "—"}</div>
        </div>
        <div className="space-y-1">
          <div className="text-gray-500">Last seen</div>
          <div className="text-gray-900">{last_seen ? formatAgoFromEpochSeconds(last_seen) : "—"}</div>
        </div>
        <div className="space-y-1">
          <div className="text-gray-500">Stage</div>
          <div className="text-gray-900">{stage ?? "—"}</div>
        </div>
      </div>
    </div>
  );
}
