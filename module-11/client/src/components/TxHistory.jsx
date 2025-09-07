import React from "react";
import { useWallet } from "../context/WalletContext";

export default function TxHistory({ chain = "sepolia" }) {
  const { selectedAccount } = useWallet();
  const list = selectedAccount?.txHistory || [];
  const base = chain === "holesky" ? "https://holesky.etherscan.io/tx/" : "https://sepolia.etherscan.io/tx/";

  return (
    <div className="p-3 border rounded-lg">
      <div className="font-medium mb-2">Recent Transactions</div>
      {list.length === 0 && <div className="text-sm opacity-70">No local history yet.</div>}
      <ul className="space-y-2">
        {list.map((t, i) => (
          <li key={i} className="text-sm">
            <a className="text-blue-600 underline" href={base + t.hash} target="_blank" rel="noreferrer">
              {t.hash.slice(0,10)}…{t.hash.slice(-6)}
            </a>{" "}
            · {t.type} → {t.to.slice(0,6)}…{t.to.slice(-4)} · {new Date(t.time).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
}