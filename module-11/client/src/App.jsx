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
        {/* keep your manager fully visible */}
        <section className="space-y-4">
          <h1 className="text-2xl font-semibold">Wallet Manager</h1>
          <WalletManager />
        </section>

        {/* balances + tx history (collapsible like your dev tools) */}
        <section className="space-y-3">
          <details className="border rounded-lg p-3" open>
            <summary className="cursor-pointer font-medium">Balances</summary>
            {/* If your BalanceCard uses useWallet() internally, no props needed */}
            <BalanceCard />
            {/* If yours is prop-driven instead, use this instead:
              <BalancesFromProps />
            */}
          </details>

          <details className="border rounded-lg p-3" open>
            <summary className="cursor-pointer font-medium">Transaction History</summary>
            <TxHistory />
            {/* If yours is prop-driven instead, use this instead:
              <TxHistoryFromProps />
            */}
          </details>
        </section>

        {/* dev tools: toggleable to reduce clutter */}
        <section className="space-y-3">
          <details className="border rounded-lg p-3" open>
            <summary className="cursor-pointer font-medium">Dev: ETH Send / Nonce</summary>
            <TxPlayground />
          </details>

          <details className="border rounded-lg p-3">
            <summary className="cursor-pointer font-medium">Dev: ERC-20 Transfer (Manual Gas)</summary>
            <TokenTransfer />
          </details>
        </section>
      </main>
    </WalletProvider>
  );
}
