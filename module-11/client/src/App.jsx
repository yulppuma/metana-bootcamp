// src/App.jsx
import React from "react";
import { WalletProvider } from "./context/WalletContext.jsx";
import WalletManager from "./components/WalletManager.jsx";

export default function App() {
  return (
    <WalletProvider>
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Basic Crypto Wallet — Wallet Creation</h1>
        <WalletManager />
      </div>
    </WalletProvider>
  );
}
