// src/App.jsx
import React from "react";
import { WalletProvider } from "./context/WalletContext.jsx";
import WalletManager from "./components/WalletManager.jsx";
import TxPlayground from "./components/TxPlayground.jsx";
import TokenTransfer from "./components/TokenTransfer.jsx";
import BalanceCard from "./components/BalanceCard.jsx";
import TxHistory from "./components/TxHistory.jsx";

export default function App() {
  return (
    <WalletProvider>
      <main className="p-6 space-y-6 max-w-5xl mx-auto">
        <section className="space-y-4">
          <h1 className="text-2xl font-semibold">Wallet Manager</h1>
          <WalletManager />
        </section>
        <section className="space-y-3">
          <details className="border rounded-lg p-3" open>
            <summary className="cursor-pointer font-medium">Balances</summary>
            <BalanceCard />
          </details>

          <details className="border rounded-lg p-3" open>
            <summary className="cursor-pointer font-medium">Transaction History</summary>
            <TxHistory />
          </details>
        </section>
        <section className="space-y-3">
          <details className="border rounded-lg p-3" open>
            <summary className="cursor-pointer font-medium">ETH Send / Nonce</summary>
            <TxPlayground />
          </details>

          <details className="border rounded-lg p-3">
            <summary className="cursor-pointer font-medium">ERC-20 Transfer</summary>
            <TokenTransfer />
          </details>
        </section>
      </main>
    </WalletProvider>
  );
}
