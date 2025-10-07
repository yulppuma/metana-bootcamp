import React, { useEffect, useState } from "react";
import { useMyScan } from "../context/MyScanProvider";
import { useActivity } from "../context/ActivityProvider";
import { useAccount, usePublicClient } from "wagmi";
import { CONTRACT_ADDRESSES } from "../context/chainConfig";
import { getUsdFeedForSymbol } from "../utils/feeds";
import MyPriceFeedArtifact from "../utils/MyPriceFeed.json";

const MyPriceFeedAbi = Array.isArray(MyPriceFeedArtifact?.abi)
  ? MyPriceFeedArtifact.abi
  : MyPriceFeedArtifact;

const INPUT_STYLE = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "8px 12px",
  height: 40,
  boxSizing: "border-box",
};

export default function SendEthPanel() {
  const { sendEth } = useMyScan();
  const { ingestTx } = useActivity();
  const { chainId } = useAccount();
  const publicClient = usePublicClient();

  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [hash, setHash] = useState(null);
  const [busy, setBusy] = useState(false);
  const [usdValue, setUsdValue] = useState(null);

  // resolve MyPriceFeed for current chain
  const resolvedChainId = chainId || 11155111; // Sepolia fallback
  const current = CONTRACT_ADDRESSES[resolvedChainId] || CONTRACT_ADDRESSES[11155111];
  const myPriceFeed = current?.MyPriceFeed;

  const [btnHover, setBtnHover] = useState(false);
  const [btnDown, setBtnDown] = useState(false);

  // Live USD ≈ under Amount
  useEffect(() => {
    let stopped = false;
    async function updateUsd() {
      if (!Number(amount) || !myPriceFeed) {
        setUsdValue(null);
        return;
      }
      try {
        const ethFeed = getUsdFeedForSymbol("ETH");
        if (!ethFeed) { setUsdValue(null); return; }
        const [ans, dec] = await publicClient.readContract({
          address: myPriceFeed,
          abi: MyPriceFeedAbi,
          functionName: "getDataFeed",
          args: [ethFeed],
        });
        const unitUsd = Number(ans) / 10 ** Number(dec);
        const num = parseFloat(amount);
        if (!stopped) setUsdValue(!isNaN(num) ? num * unitUsd : null);
      } catch {
        if (!stopped) setUsdValue(null);
      }
    }
    updateUsd();
    return () => { stopped = true; };
  }, [amount, myPriceFeed, publicClient]);

  async function go() {
    if (!to || !amount) return;
    setBusy(true);
    try {
      const h = await sendEth({ to, amountEth: amount, memo });
      setHash(h);
      try { await ingestTx(h); } catch {}
      setUsdValue(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Send ETH</div>

      {/* Inputs row */}
      <div
        style={{
          display: "grid",
          gap: 8,
          gridTemplateColumns: "1fr 1fr 1fr",
          marginBottom: 8,
          alignItems: "start",
        }}
      >
        <input
          placeholder="To (0x…)"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          spellCheck={false}
          style={{ ...INPUT_STYLE }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <input
            placeholder="Amount (ETH)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            style={{ ...INPUT_STYLE, width: "100%" }}
          />
          <div style={{ height: 16, fontSize: 12, color: "#6b7280" }}>
            {usdValue != null ? `≈ $${usdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "\u00A0"}
          </div>
        </div>

        <input
          placeholder="Memo"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          style={{ ...INPUT_STYLE }}
        />
      </div>

      {/* Footer: just send button + hash feedback */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
        <button
          onClick={go}
          disabled={busy}
          onMouseEnter={() => setBtnHover(true)}
          onMouseLeave={() => { setBtnHover(false); setBtnDown(false); }}
          onMouseDown={() => setBtnDown(true)}
          onMouseUp={() => setBtnDown(false)}
          style={{
            flexShrink: 0,
            padding: "6px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            background: "white",
            whiteSpace: "nowrap",
            cursor: busy ? "default" : "pointer",
            opacity: busy ? 0.6 : 1,
            transition: "transform 120ms ease, box-shadow 120ms ease, opacity 120ms ease, border-color 120ms ease",
            transform: btnDown ? "translateY(1px)" : "translateY(0)",
            boxShadow: btnHover && !busy ? "0 2px 10px rgba(0,0,0,0.06)" : "none",
            borderColor: btnHover && !busy ? "#d1d5db" : "#e5e7eb",
          }}
        >
          {busy ? "Sending…" : "Send"}
        </button>
      </div>

      {hash && (
        <div style={{ fontSize: 12, marginTop: 8 }}>
          Submitted:{" "}
          <a
            href={`https://sepolia.etherscan.io/tx/${hash}`}
            target="_blank"
            rel="noreferrer"
          >
            {hash.slice(0, 10)}…
          </a>
        </div>
      )}
    </div>
  );
}
