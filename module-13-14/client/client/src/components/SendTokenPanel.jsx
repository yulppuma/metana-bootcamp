import React, { useEffect, useMemo, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { isAddress, formatUnits } from "viem";
import { useMyScan } from "../context/MyScanProvider";
import { getUsdFeedForSymbol } from "../utils/feeds";
import { useActivity } from "../context/ActivityProvider";
import { CONTRACT_ADDRESSES } from "../context/chainConfig";
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

export default function SendTokenPanel() {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { myScan, getTokenInfo, getBalance, getAllowance, sendTokenAuto } = useMyScan();
  const { ingestTx } = useActivity();

  const [tokenAddr, setTokenAddr] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [feed, setFeed] = useState("");

  const [meta, setMeta] = useState({ symbol: "", decimals: 18, name: "" });
  const [balRaw, setBalRaw] = useState(0n);

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [usdValue, setUsdValue] = useState(null); // ≈ USD for typed amount

  // resolve MyPriceFeed for current chain
  const resolvedChainId = chainId || 11155111; // Sepolia fallback
  const current = CONTRACT_ADDRESSES[resolvedChainId] || CONTRACT_ADDRESSES[11155111];
  const myPriceFeed = current?.MyPriceFeed;
  const [btnHover, setBtnHover] = useState(false);
  const [btnDown, setBtnDown] = useState(false);

  const tokenKnown = isAddress(tokenAddr) && !!meta?.symbol;
  const balanceStr = useMemo(
    () => (balRaw ? formatUnits(balRaw, meta.decimals || 18) : "0"),
    [balRaw, meta.decimals]
  );

  useEffect(() => {
    (async () => {
      setStatus("");
      if (!isAddress(tokenAddr) || !address) {
        setMeta({ symbol: "", decimals: 18, name: "" });
        setBalRaw(0n);
        setFeed("");
        setUsdValue(null);
        return;
      }
      try {
        const info = await getTokenInfo(tokenAddr);
        setMeta(info);

        const [b] = await Promise.all([
          getBalance(tokenAddr, address),
          getAllowance(tokenAddr, address).catch(() => 0n),
        ]);
        setBalRaw(b);

        const f = getUsdFeedForSymbol(info.symbol);
        setFeed(f || "");
        setUsdValue(null);
      } catch (e) {
        setStatus(`Failed to load token info: ${e?.message || e}`);
        setFeed("");
        setUsdValue(null);
      }
    })();
  }, [tokenAddr, address]);

  useEffect(() => {
    let stopped = false;
    async function updateUsd() {
      if (!Number(amount) || !isAddress(myPriceFeed || "")) {
        setUsdValue(null);
        return;
      }
      if (!feed || !isAddress(feed)) {
        setUsdValue(null);
        return;
      }
      try {
        const [ans, dec] = await publicClient.readContract({
          address: myPriceFeed,
          abi: MyPriceFeedAbi,
          functionName: "getDataFeed",
          args: [feed],
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
  }, [amount, feed, myPriceFeed, publicClient]);

  async function onSend() {
    setStatus("");
    if (!isAddress(tokenAddr)) return setStatus("Enter a valid token address.");
    if (!isAddress(to)) return setStatus("Enter a valid recipient address.");
    if (!Number(amount)) return setStatus("Enter a valid amount.");
    if (!myScan) return setStatus("MyScan address missing.");
    if (!feed || !isAddress(feed)) return setStatus("No price feed available for this token.");

    setBusy(true);
    try {
      setStatus("Checking allowance / approving if needed…");
      const txHash = await sendTokenAuto({ token: tokenAddr, to, amount, memo, feed });
      setStatus(`Sent ${amount} ${meta.symbol} • tx: ${txHash.slice(0, 10)}…`);

      try { await ingestTx(txHash); } catch {}
      setAmount("");
      setMemo("");
      const b = await getBalance(tokenAddr, address);
      setBalRaw(b);
      setUsdValue(null);
    } catch (e) {
      setStatus(`Send failed: ${e?.shortMessage || e?.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
      {/* Header to match SendEthPanel */}
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Send Token</div>

      {/* Token Address */}
      <div style={{ marginBottom: 8 }}>
        <input
          placeholder="Token address (0x…)"
          value={tokenAddr}
          onChange={(e) => setTokenAddr(e.target.value.trim())}
          spellCheck={false}
          style={{ ...INPUT_STYLE, width: "100%" }}
        />
        {tokenKnown && (
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
            {meta.name || meta.symbol} ({meta.symbol}) • decimals: {meta.decimals}
          </div>
        )}
      </div>

      {/* Main inputs row: To / Amount / Memo */}
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
          onChange={(e) => setTo(e.target.value.trim())}
          spellCheck={false}
          style={{ ...INPUT_STYLE }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <input
            placeholder={`Amount (${meta.symbol || "tokens"})`}
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

      {/* Footer row: read-only feed (left) + send button (right) */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            value={feed || ""}
            readOnly
            disabled
            title={feed || "No USD feed linked"}
            style={{
              ...INPUT_STYLE,
              width: "100%",
              fontSize: 12,
              color: feed ? "#111827" : "#9CA3AF",
              background: "#F9FAFB",
              cursor: "not-allowed",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          />
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
            {tokenKnown ? (
              <>Balance: {balanceStr} {meta.symbol}</>
            ) : (
              <>Enter a token address to load balance</>
            )}
          </div>
        </div>

        <button
          onClick={onSend}
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

      {/* Status */}
      {status && (
        <div style={{ fontSize: 12, marginTop: 8, color: "#374151" }}>
          {status}
        </div>
      )}
    </div>
  );
}
