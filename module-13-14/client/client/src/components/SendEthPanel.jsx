import React, { useState } from "react";
import { useMyScan } from "../context/MyScanProvider";
import MyScanArtifact from "../utils/MyScan.json";
import { usePublicClient, useWalletClient } from "wagmi";
import { parseEther } from "viem";
import { useActivity } from "../context/ActivityProvider";

export default function SendEthPanel() {
  const { sendEth } = useMyScan();
  const { ingestTx } = useActivity();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [hash, setHash] = useState(null);

  async function go() {
    if (!to || !amount) return;
    const h = await sendEth({ to, amountEth: amount, memo });
    setHash(h);
    // Decode & append PaymentStamped from this transaction to the activity feed
    try { await ingestTx(h); } catch {}
  }

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Send ETH</div>
      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr 1fr" }}>
        <input placeholder="To (0x…)" value={to} onChange={(e) => setTo(e.target.value)} />
        <input placeholder="Amount (ETH)" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <input placeholder="Memo" value={memo} onChange={(e) => setMemo(e.target.value)} />
      </div>
      <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between" }}>
        <div style={{ fontSize: 12, color: "#6b7280" }}>Price & memo stamped on-chain</div>
        <button onClick={go} style={{ padding: "6px 12px" }}>Send</button>
      </div>
      {hash && (
        <div style={{ fontSize: 12, marginTop: 8 }}>
          Submitted:{" "}
          <a href={`https://sepolia.etherscan.io/tx/${hash}`} target="_blank" rel="noreferrer">
            {hash.slice(0, 10)}…
          </a>
        </div>
      )}
    </div>
  );
}
