import React from "react";
import { useActivity } from "../context/ActivityProvider";
import { isAddress } from "viem";

const ZERO = "0x0000000000000000000000000000000000000000";

const shortAddr = (addr) =>
  isAddress(addr || "") ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "—";

const fmtUSD = (n) => {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  const digits =
    abs >= 1000 ? 2 :
    abs >= 10   ? 2 :
    abs >= 1    ? 3 : 4;
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

const fmtDelta = (n) => {
  if (typeof n !== "number" || !Number.isFinite(n)) return "";
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  const val = Math.abs(n);
  const abs = Math.abs(n);
  const digits =
    abs >= 1000 ? 2 :
    abs >= 10   ? 2 :
    abs >= 1    ? 3 : 4;
  return `${sign}${val.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
};

const fmtPct = (n) => {
  if (typeof n !== "number" || !Number.isFinite(n)) return "";
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  const val = Math.abs(n);
  return `${sign}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
};

export default function ActivityFeed() {
  const { items } = useActivity();

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Recent Activity</div>

      {(!items || items.length === 0) && (
        <div style={{ fontSize: 13, color: "#6b7280" }}>No recent activity.</div>
      )}

      {items?.map((it) => {
        const when =
          it?.updatedAt != null
            ? new Date(Number(it.updatedAt) * 1000).toLocaleString()
            : "—";
        const to = shortAddr(it?.payee);
        const from = shortAddr(it?.payer);
        const sym =
          it?.assetSymbol ||
          (it?.asset && String(it.asset).toLowerCase() !== ZERO ? "TOKEN" : "ETH");
        const amountStr = it?.amountStr ?? "0";

        const thenTotal = it?.totalUsdThen ?? null;
        const nowTotal  = it?.totalUsdNow  ?? null;

        const delta = (thenTotal != null && nowTotal != null) ? nowTotal - thenTotal : null;
        const pct   = (delta != null && thenTotal) ? (delta / thenTotal) * 100 : null;

        const tx = it?.txHash || "";
        const key = tx ? `${tx}-${it?.logIndex ?? 0}` : Math.random();

        return (
          <div
            key={key}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 12,
              padding: "12px 0",
              borderBottom: "1px solid #eee",
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>{when}</div>
              <div style={{ fontWeight: 600 }}>
                {amountStr} {sym}{" "}
                <span style={{ fontWeight: 400, color: "#6b7280" }}>
                  ({from} → {to})
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                Memo: {it?.memo?.trim() ? it.memo : "—"}
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Value</div>
              <div style={{ fontWeight: 600 }}>
                {fmtUSD(thenTotal)} <span style={{ color: "#6b7280" }}>→</span> {fmtUSD(nowTotal)}
              </div>
              {(delta != null) && (
                <div style={{ marginTop: 4, fontSize: 12, color: delta >= 0 ? "#16a34a" : "#dc2626" }}>
                  {fmtDelta(delta)} {pct != null ? `(${fmtPct(pct)})` : ""}
                </div>
              )}
              {tx && (
                <div style={{ marginTop: 6 }}>
                  <a
                    style={{ fontSize: 12 }}
                    href={`https://sepolia.etherscan.io/tx/${tx}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View on Etherscan
                  </a>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
