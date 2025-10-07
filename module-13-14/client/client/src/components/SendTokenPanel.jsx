import React, { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { isAddress } from "viem";
import { useMyScan } from "../context/MyScanProvider";
import { getUsdFeedForSymbol } from "../utils/feeds";
import MyScanArtifact from "../utils/MyScan.json";
import { ERC20_ABI } from "../utils/erc20Abi";
import { usePublicClient, useWalletClient } from "wagmi";
import { parseUnits, maxUint256 } from "viem";
import { useActivity } from "../context/ActivityProvider";

export default function SendTokenPanel() {
  const { address } = useAccount();
  const { myScan, getTokenInfo, getBalance, getAllowance, sendTokenAuto } = useMyScan();
  const { ingestTx } = useActivity();

  const [tokenAddr, setTokenAddr] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [feed, setFeed] = useState("");

  const [meta, setMeta] = useState({ symbol: "", decimals: 18, name: "" });
  const [bal, setBal] = useState(0n);
  const [allow, setAllow] = useState(0n);

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  // Load token info/balance/allowance when token changes
  useEffect(() => {
    (async () => {
      setStatus("");
      if (!isAddress(tokenAddr) || !address) {
        setMeta({ symbol: "", decimals: 18, name: "" });
        setBal(0n);
        setAllow(0n);
        return;
      }
      try {
        const info = await getTokenInfo(tokenAddr);
        setMeta(info);
        const [b, a] = await Promise.all([
          getBalance(tokenAddr, address),
          getAllowance(tokenAddr, address),
        ]);
        setBal(b);
        setAllow(a);
        // auto-fill feed from "<SYM> / USD" if present
        const f = getUsdFeedForSymbol(info.symbol);
        if (f && !feed) setFeed(f);
      } catch (e) {
        setStatus(`Failed to load token info: ${e?.message || e}`);
      }
    })();
  }, [tokenAddr, address]);

  async function onSend() {
    setStatus("");
    if (!isAddress(tokenAddr)) return setStatus("Enter a valid token address.");
    if (!isAddress(to)) return setStatus("Enter a valid recipient address.");
    if (!Number(amount)) return setStatus("Enter a valid amount.");
    if (!myScan) return setStatus("MyScan address missing.");
    if (!feed || !isAddress(feed)) return setStatus("Provide a valid Chainlink feed address (e.g. <SYM> / USD).");

    setBusy(true);
    try {
      setStatus("Checking allowance / approving if needed…");
      const txHash = await sendTokenAuto({ token: tokenAddr, to, amount, memo, feed });
      setStatus(`Sent ${amount} ${meta.symbol} • tx: ${txHash.slice(0, 10)}…`);

      // Immediately ingest and append freshly emitted PaymentStamped from this tx
      try { await ingestTx(txHash); } catch {}

      // clear amount/memo & refresh balance/allowance
      setAmount("");
      setMemo("");
      const [b, a] = await Promise.all([getBalance(tokenAddr, address), getAllowance(tokenAddr, address)]);
      setBal(b);
      setAllow(a);
    } catch (e) {
      setStatus(`Send failed: ${e?.shortMessage || e?.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border p-4">
      <h3 className="font-semibold mb-3">Send ERC-20</h3>

      <label className="block text-sm mb-1">Token address</label>
      <input
        className="w-full border rounded px-3 py-2 mb-3"
        placeholder="0x… (ERC-20)"
        value={tokenAddr}
        onChange={(e) => setTokenAddr(e.target.value.trim())}
        spellCheck={false}
      />

      {meta.symbol ? (
        <div className="text-sm text-gray-600 mb-3">
          <div><b>{meta.name || meta.symbol}</b> ({meta.symbol}) • decimals: {meta.decimals}</div>
        </div>
      ) : null}

      <label className="block text-sm mb-1">Recipient</label>
      <input
        className="w-full border rounded px-3 py-2 mb-3"
        placeholder="0x…"
        value={to}
        onChange={(e) => setTo(e.target.value.trim())}
        spellCheck={false}
      />

      <label className="block text-sm mb-1">Amount ({meta.symbol || "tokens"})</label>
      <input
        className="w-full border rounded px-3 py-2 mb-3"
        placeholder="0.0"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        inputMode="decimal"
      />

      <label className="block text-sm mb-1">Memo (optional)</label>
      <input
        className="w-full border rounded px-3 py-2 mb-3"
        placeholder="For lunch 🌯"
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
      />

      <label className="block text-sm mb-1">Price feed address (Chainlink)</label>
      <input
        className="w-full border rounded px-3 py-2 mb-3"
        placeholder="0x… (e.g., USDC / USD)"
        value={feed}
        onChange={(e) => setFeed(e.target.value.trim())}
        spellCheck={false}
      />

      <div className="flex gap-8 text-xs text-gray-600 mb-3">
        <div>Balance: {bal.toString()}</div>
        <div>Allowance → MyScan: {allow.toString()}</div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onSend}
          disabled={busy}
          className="px-3 py-2 rounded-lg border disabled:opacity-60"
        >
          {busy ? "Working…" : "Send"}
        </button>
      </div>

      {status ? <div className="mt-3 text-sm">{status}</div> : null}
    </div>
  );
}
