import React, { useEffect, useState } from "react";
import { useWallet } from "../context/WalletContext";
import { makeRpc, resolveRpcFromEnv } from "../context/utils/tx-ec";

function formatEth(wei) {
  const bn = BigInt(wei);
  const whole = bn / 10n ** 18n;
  const frac = (bn % 10n ** 18n).toString().padStart(18, "0").slice(0, 6);
  return `${whole}.${frac}`;
}

function fmtUnits(raw, decimals) {
  try {
    const s = BigInt(raw || "0").toString();
    const d = Number(decimals || 0);
    if (d <= 0) return s;
    if (s.length <= d) {
      const z = "0".repeat(d - s.length);
      const frac = (z + s).replace(/0+$/, "");
      return frac ? `0.${frac}` : "0";
    }
    const whole = s.slice(0, s.length - d);
    const frac = s.slice(s.length - d).replace(/0+$/, "");
    return frac ? `${whole}.${frac}` : whole;
  } catch { return "0"; }
}

export default function BalanceCard({ chain = "sepolia" }) {
  const { selectedAccount, activeId, activeWallet, importTokenToAccount, refreshTokenBalances } = useWallet();
  const [wei, setWei] = useState("0");
  const [err, setErr] = useState("");
  const [tokenAddr, setTokenAddr] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function onImportToken() {
    try {
        setBusy(true); setMsg("");
        if (!activeWallet) throw new Error("Select a wallet/account first");
        const t = await importTokenToAccount({
        walletId: activeId,
        index: activeWallet.activeAccountIndex, // use array slot
        chain,
        tokenAddress: tokenAddr.trim(),
        });
        setMsg(`Imported ${t.symbol} (${t.decimals})`);
        setTokenAddr("");
    } catch (e) {
        setMsg(e.message || String(e));
    } finally {
        setBusy(false);
    }
    }

    async function onRefreshTokens() {
    try {
        setBusy(true); setMsg("");
        await refreshTokenBalances({
        walletId: activeId,
        index: activeWallet.activeAccountIndex,
        chain,
        });
        setMsg("Token balances refreshed");
    } catch (e) {
        setMsg(e.message || String(e));
    } finally {
        setBusy(false);
    }
    }

  useEffect(() => {
    let stop = false;
    if (!selectedAccount?.address) return;

    async function tick() {
      try {
        const rpcUrl = resolveRpcFromEnv(chain);

        // Guard: show a helpful error instead of throwing
        if (!rpcUrl) {
          setErr(
            `Missing RPC URL for ${chain}. Check .env (VITE_${chain.toUpperCase()}_RPC) and restart the dev server.`
          );
          return;
        }

        const rpc = makeRpc(rpcUrl); // create inside try/catch
        const bal = await rpc("eth_getBalance", [selectedAccount.address, "latest"]);

        if (!stop) {
          setErr("");
          setWei(BigInt(bal).toString());
        }
      } catch (e) {
        if (!stop) setErr(e.message || String(e));
      }
    }

    tick();
    const id = setInterval(tick, 8000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [selectedAccount?.address, chain]);

  return (
    <div className="p-3 border rounded-lg">
      <div className="text-sm opacity-80">Chain: {chain}</div>
      <div className="font-mono text-lg">
        {selectedAccount?.address ? (
          <>
            {formatEth(wei)} ETH
            <div className="text-xs opacity-70">{selectedAccount.address}</div>
          </>
        ) : (
          "Select an account"
        )}
      </div>
      {!!err && <div className="text-xs text-red-600 mt-1">{err}</div>}
      {selectedAccount && (
        <div className="mt-3 space-y-2">
        <div className="text-xs text-muted-foreground">Tokens on {chain}</div>
        <div className="flex gap-2 items-center">
            <input
            className="border rounded px-2 py-1 font-mono flex-1"
            placeholder="ERC-20 contract (0x...)"
            value={tokenAddr}
            onChange={(e)=>setTokenAddr(e.target.value)}
            />
            <button
            className="px-2 py-1 border rounded text-sm"
            disabled={busy || !tokenAddr}
            onClick={onImportToken}
            >
            {busy ? "…" : "Import"}
            </button>
            <button
            className="px-2 py-1 border rounded text-sm"
            disabled={busy}
            onClick={onRefreshTokens}
            >
            {busy ? "…" : "Refresh"}
            </button>
        </div>
        {msg && <div className="text-xs">{msg}</div>}

        {/* token rows */}
        {(() => {
            const tokens = selectedAccount.tokens || [];
            const rows = tokens
            .filter(t => t.chain === chain)
            .map(t => {
                const key = `${t.chain}:${t.address.toLowerCase()}`;
                const raw = selectedAccount.balances?.[key] || "0";
                return { ...t, raw };
            });
            return rows.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {rows.map(t => (
                <div key={`${t.chain}:${t.address}`} className="flex items-center justify-between border rounded px-2 py-1 text-sm">
                    <div className="flex items-center gap-2">
                    <span className="font-semibold">{t.symbol}</span>
                    <span className="text-xs opacity-70">{t.name}</span>
                    </div>
                    <div className="font-mono">{fmtUnits(t.raw, t.decimals)}</div>
                </div>
                ))}
            </div>
            ) : (
            <div className="text-sm text-muted-foreground">No imported tokens yet.</div>
            );
            })()}
        </div>
    )}
    </div>
  );
}