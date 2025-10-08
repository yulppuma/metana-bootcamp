import React from "react";
import { useActivity } from "../context/ActivityProvider";

export default function PriceNowButton() {
  const { refreshUsdNow, nowRefreshing, nowMeta } = useActivity();
  const last = nowMeta?.updatedAt ? new Date(nowMeta.updatedAt).toLocaleTimeString() : null;

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={refreshUsdNow}
        disabled={nowRefreshing}
        className="px-3 py-2 rounded-xl border text-sm disabled:opacity-60"
        title="Fetch current USD prices for all feeds in view"
      >
        {nowRefreshing ? "Updating…" : "Refresh USD Prices"}
      </button>
      <div className="text-xs text-gray-500">
        {last ? <>updated {last}</> : <>click to fetch current USD prices</>}
      </div>
    </div>
  );
}
