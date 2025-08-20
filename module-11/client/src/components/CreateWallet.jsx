import { useWallet } from "@/context/WalletContext";
import { Button } from "@/components/ui/button";

export default function CreateWallet() {
  const { createWallet, wallet } = useWallet();

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold">Create a new wallet</h2>
      {!wallet ? (
        <Button className="mt-4" onClick={createWallet}>Generate Wallet</Button>
      ) : (
        <div className="mt-4">
          <p>Address: {wallet.address}</p>
          <p>Private Key: {wallet.privateKey}</p>
        </div>
      )}
    </div>
  );
}