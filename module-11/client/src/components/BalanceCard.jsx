import React, { useEffect, useState } from "react";
import { useWallet } from "../context/WalletContext";
import { makeRpc, resolveRpcFromEnv } from "../context/utils/tx-ec";

function formatEth(wei) {
  const bn = BigInt(wei);
  const whole = bn / 10n ** 18n;
  const frac = (bn % 10n ** 18n).toString().padStart(18, "0").slice(0, 6);
  return `${whole}.${frac}`;
}

export default function BalanceCard({ chain = "sepolia" }) {
  const { selectedAccount } = useWallet();
  const [wei, setWei] = useState("0");
  const [err, setErr] = useState("");

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
    </div>
  );
}