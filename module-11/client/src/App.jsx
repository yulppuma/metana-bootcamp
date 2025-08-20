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

  if (wallet) return <div> {/* Dashboard will go here */} </div>;

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
