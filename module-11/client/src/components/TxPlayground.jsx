import React, { useMemo, useState, useEffect } from "react";
import { useWallet } from "../context/WalletContext";

export default function TxPlayground() {
  const {
    activeWallet,
    selectedAccount,
    sendEthFromAccount,
    getAccountPendingNonce,
  } = useWallet();

  const [chain, setChain] = useState("sepolia"); // "sepolia" | "holesky"
  const [to, setTo] = useState("");
  const [valueWei, setValueWei] = useState("100000000000000"); // 0.0001 ether
  const [password, setPassword] = useState("");
  const [nonce, setNonce] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const fromAddr = selectedAccount?.address || "";

  useEffect(() => {
    let ignore = false;
    (async () => {
      setErr("");
      setNonce(null);
      setTxHash(null);
      if (!fromAddr) return;
      try {
        const rpcUrl =
          chain === "holesky"
            ? import.meta.env.VITE_HOLESKY_RPC
            : import.meta.env.VITE_SEPOLIA_RPC;

        const n = await getAccountPendingNonce({ rpcUrl, address: fromAddr });
        if (!ignore) setNonce(n.toString());
      } catch (e) {
        if (!ignore) setErr(e.message || String(e));
      }
    })();
    return () => { ignore = true; };
  }, [chain, fromAddr, getAccountPendingNonce]);

  async function onSendEth(e) {
    e.preventDefault();
    if (!activeWallet || selectedAccount == null) return;
    setBusy(true); setErr(""); setTxHash(null);
    try {
      const rpcUrl =
        chain === "holesky"
          ? import.meta.env.VITE_HOLESKY_RPC
          : import.meta.env.VITE_SEPOLIA_RPC;

      const res = await sendEthFromAccount({
        rpcUrl,
        chain,
        walletId: activeWallet.id,
        password,
        index: activeWallet.activeAccountIndex,
        to,
        valueWei
      });
      setTxHash(res.acceptedHash);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function refreshNonce() {
    const rpcUrl =
        chain === "holesky"
        ? import.meta.env.VITE_HOLESKY_RPC
        : import.meta.env.VITE_SEPOLIA_RPC;
    const n = await getAccountPendingNonce({ rpcUrl, address: fromAddr });
    setNonce(n.toString());
    }

  const explorerBase =
    chain === "holesky"
      ? "https://holesky.etherscan.io/tx/"
      : "https://sepolia.etherscan.io/tx/";

  return (
    <div className="space-y-3 p-4 rounded-xl border">
      <div className="text-sm opacity-80">
        From: <span className="font-mono">{fromAddr || "(select an account)"}</span>
      </div>

      <div className="flex gap-2">
        <label className="text-sm">Chain:</label>
        <select className="border rounded px-2 py-1" value={chain} onChange={(e)=>setChain(e.target.value)}>
          <option value="sepolia">Sepolia</option>
          <option value="holesky">Holesky</option>
        </select>
      </div>

      <div className="text-sm">
        Pending nonce: <b>{nonce ?? "…"}</b>
        <button className="ml-2 text-xs underline" onClick={refreshNonce}>refresh</button>
      </div>
      

      <form onSubmit={onSendEth} className="space-y-2">
        <input
          className="w-full border rounded px-2 py-1 font-mono"
          placeholder="0xRecipient..."
          value={to}
          onChange={(e)=>setTo(e.target.value)}
        />
        <input
          className="w-full border rounded px-2 py-1 font-mono"
          placeholder="Value in wei (e.g. 100000000000000)"
          value={valueWei}
          onChange={(e)=>setValueWei(e.target.value)}
        />
        <input
          type="password"
          className="w-full border rounded px-2 py-1"
          placeholder="Wallet password"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
        />
        <button
          className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
          disabled={busy || !fromAddr || !to || !password}
        >
          {busy ? "Sending…" : "Send ETH"}
        </button>
      </form>

      {!!txHash && (
        <div className="text-sm">
          Sent! Tx:{" "}
          <a className="text-blue-600 underline" href={explorerBase + txHash} target="_blank" rel="noreferrer">
            {txHash}
          </a>
        </div>
      )}
      {!!err && <div className="text-red-600 text-sm">{err}</div>}
    </div>
  );
}