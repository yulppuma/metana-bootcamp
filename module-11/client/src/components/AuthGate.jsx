import { useWallet } from "../context/WalletContext";
import StartScreen from "./StartScreen"; // see below

export default function AuthGate({ children }) {
  const { locked } = useWallet();
  return locked ? <StartScreen /> : children;
}