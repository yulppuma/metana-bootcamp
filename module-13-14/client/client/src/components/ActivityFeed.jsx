import React from "react";
import { useAccount } from "wagmi";
import { useActivity } from "../context/ActivityProvider";
import { useFriends } from "../context/FriendsProvider";

function shortAddr(a) {
  if (!a) return "";
  return a.slice(0, 6) + "…" + a.slice(-4);
}

function AddrWithName({ addr }) {
  const { getName } = useFriends();
  if (!addr) return null;
  const name = getName(addr);
  const short = shortAddr(addr);
  return (
    <span title={addr} style={{ fontWeight: 500 }}>
      {name ? `${name} (${short})` : short}
    </span>
  );
}

function AmountCell({ amountStr, symbol, totalUsdThen, totalUsdNow }) {
  const hasNow = typeof totalUsdNow === "number" && !Number.isNaN(totalUsdNow);
  const hasThen = typeof totalUsdThen === "number" && !Number.isNaN(totalUsdThen);
  return (
    <div style={{ textAlign: "right" }}>
      <div style={{ fontWeight: 700 }}>
        {amountStr} {symbol || ""}
      </div>
      <div style={{ fontSize: 12, color: "#6b7280" }}>
        {hasThen ? `then ≈ $${totalUsdThen.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : ""}
        {hasNow ? `${hasThen ? " • " : ""}now ≈ $${totalUsdNow.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : ""}
        {!hasThen && !hasNow ? "\u00A0" : ""}
      </div>
    </div>
  );
}

export default function ActivityFeed() {
  const { address } = useAccount();
  const activeLc = address ? address.toLowerCase() : null;

  const {
    items,
    nowRefreshing,
    refreshUsdNow,
    loadOlderHistory,
    loadingOlder,
    canLoadOlder,
  } = useActivity();

  const visible = React.useMemo(() => {
    if (!activeLc) return [];
    return (items || []).filter((r) => {
      const p = r?.payer ? String(r.payer).toLowerCase() : "";
      const q = r?.payee ? String(r.payee).toLowerCase() : "";
      return p === activeLc || q === activeLc;
    });
  }, [items, activeLc]);

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontWeight: 600 }}>
          Recent Activity{activeLc ? ` — ${shortAddr(activeLc)}` : ""}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={refreshUsdNow}
            disabled={nowRefreshing}
            style={{
              fontSize: 12,
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: "4px 8px",
              background: "white",
              opacity: nowRefreshing ? 0.6 : 1,
              cursor: nowRefreshing ? "default" : "pointer",
              transition: "box-shadow 120ms ease, border-color 120ms ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.06)")}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
          >
            {nowRefreshing ? "Refreshing…" : "Refresh Prices"}
          </button>
          {canLoadOlder && (
            <button
              onClick={() => loadOlderHistory()}
              disabled={loadingOlder}
              style={{
                fontSize: 12,
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: "4px 8px",
                background: "white",
                opacity: loadingOlder ? 0.6 : 1,
                cursor: loadingOlder ? "default" : "pointer",
                transition: "box-shadow 120ms ease, border-color 120ms ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.06)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
            >
              {loadingOlder ? "Loading…" : "Load Older"}
            </button>
          )}
        </div>
      </div>

      {(!visible || visible.length === 0) && (
        <div style={{ fontSize: 13, color: "#6b7280" }}>
          {activeLc ? `No activity yet for ${shortAddr(activeLc)}.` : "Connect a wallet to see activity."}
        </div>
      )}

      {visible?.map((it) => (
        <div
          key={`${it.txHash}-${it.logIndex}`}
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: 12,
            padding: "10px 0",
            borderBottom: "1px solid #eee",
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 2 }}>
              <AddrWithName addr={it.payer} /> → <AddrWithName addr={it.payee} />
            </div>
            {it.memo && (
              <div style={{ fontSize: 12, color: "#374151" }}>
                {it.memo}
              </div>
            )}
            <div style={{ fontSize: 12, marginTop: 4 }}>
              <a
                href={`https://sepolia.etherscan.io/tx/${it.txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                {it.txHash.slice(0, 10)}…
              </a>
              {it.updatedAt && (
                <span style={{ color: "#6b7280" }}>
                  {" "}| {new Date(it.updatedAt * 1000).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          <AmountCell
            amountStr={it.amountStr}
            symbol={it.assetSymbol}
            totalUsdThen={it.totalUsdThen}
            totalUsdNow={it.totalUsdNow}
          />
        </div>
      ))}
    </div>
  );
}
