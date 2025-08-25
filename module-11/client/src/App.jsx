 import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { Button } from "@/components/ui/button"
import { WalletProvider, useWallet } from "./context/WalletContext";
import WelcomeScreen from "./components/WelcomeScreen";
import CreateWallet from "./components/CreateWallet";

function AppInner() {
  const { wallet } = useWallet();
  const [screen, setScreen] = useState("welcome");

  if (wallet) return <div> {wallet.address} {/* 
          Address will appear here obviously;
          Along with users balance;
          For the time being, I will focus on keeping track of account nonce
          and signing/sending transactions to the blockchain

    */}</div>;

  if (screen === "create") return <CreateWallet />;
  if (screen === "import") return <div>Import Wallet Screen</div>;
  if (screen === "recover") return <div>Recover Wallet Screen</div>;
  return <WelcomeScreen onSelect={setScreen} />;
}

export default function App() {
  return (
    <WalletProvider>
      <AppInner />
    </WalletProvider>
  );
}
