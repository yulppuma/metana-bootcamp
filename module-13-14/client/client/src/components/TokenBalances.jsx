import React from "react";
import { useBalances } from "../context/BalancesProvider";

function shortAddr(a) {
  if (!a || a === "ETH") return "—";
  return a.slice(0, 6) + "…" + a.slice(-4);
}

export default function TokenBalances({ onSelectToken }) {
  const { balances, loading, refreshBalances } = useBalances();

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontWeight: 600 }}>Your Tokens</div>
        <button
          onClick={refreshBalances}
          style={{ fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 10, padding: "4px 8px", background: "white" }}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {(!balances || balances.length === 0) && !loading && (
        <div style={{ fontSize: 13, color: "#6b7280" }}>
          No detected balances. Add token addresses in <code>utils/tokenList.js</code> if needed.
        </div>
      )}

      {balances?.map((row) => (
        <div key={`${row.address}-${row.symbol}`} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, padding: "10px 0", borderBottom: "1px solid #eee" }}>
          <div>
            <div style={{ fontWeight: 600 }}>
              {row.balance.toLocaleString(undefined, { maximumFractionDigits: 6 })} {row.symbol}
            </div>
            {/* USD line if we have pricing */}
            {row.unitUsdNow != null && (
              <div style={{ fontSize: 12, color: "#374151" }}>
                ≈ ${ (row.totalUsdNow ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 }) } ({ row.unitUsdNow.toLocaleString(undefined, { maximumFractionDigits: 4 }) } USD)
              </div>
            )}
            {!row.isEth && (
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                {shortAddr(row.address)}
              </div>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            {!row.isEth && (
              <>
                <button
                  onClick={() => navigator.clipboard?.writeText(row.address)}
                  style={{ fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 10, padding: "4px 8px", marginRight: 6, background: "white" }}
                >
                  Copy
                </button>
                {onSelectToken && (
                  <button
                    onClick={() => onSelectToken(row.address)}
                    style={{ fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 10, padding: "4px 8px", background: "white" }}
                  >
                    Use
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
