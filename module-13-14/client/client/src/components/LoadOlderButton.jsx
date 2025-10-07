import React from "react";
import { useActivity } from "../context/ActivityProvider";

export default function LoadOlderButton() {
  const { loadOlderHistory, loadingOlder, canLoadOlder } = useActivity();

  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
      <button
        onClick={() => loadOlderHistory(4000n)}
        disabled={loadingOlder || !canLoadOlder}
        style={{
          padding: "8px 12px",
          borderRadius: 10,
          border: "1px solid #e5e7eb",
          fontSize: 13,
          opacity: loadingOlder || !canLoadOlder ? 0.6 : 1,
          cursor: loadingOlder || !canLoadOlder ? "not-allowed" : "pointer",
          background: "white",
        }}
        title="Fetch older on-chain events"
      >
        {loadingOlder ? "Loading…" : canLoadOlder ? "Load older" : "No older events"}
      </button>
    </div>
  );
}
