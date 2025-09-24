import React from "react";
import UptimePanel from "@/components/uptime/UptimePanel";

export default function UptimePage() {
  // Replace defaults with DB-driven OIDs when you hook it up
  const defaults = ["9b4bafe7-22b6-4e94-88d1-709f80d0a8a6"];
  return (
    <div className="p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Uptime</h1>
        <p className="text-sm text-gray-600">Live status from nerdspanner.online</p>
      </div>
      <UptimePanel defaultOids={defaults} />
    </div>
  );
}
