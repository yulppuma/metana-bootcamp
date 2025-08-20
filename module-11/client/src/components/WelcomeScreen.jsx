import { Button } from "@/components/ui/button";

export default function WelcomeScreen({ onSelect }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen space-y-4">
      <h1 className="text-2xl font-bold">Welcome to MyWallet</h1>
      <Button onClick={() => onSelect("create")}>Create Wallet</Button>
      <Button onClick={() => onSelect("import")}>Import Wallet</Button>
      <Button onClick={() => onSelect("recover")}>Recover Wallet</Button>
    </div>
  );
}