import { useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SendEth() {
  const { activeWallet, buildAndSignEip1559, sendRawTransaction } = useWallet();
  const [to, setTo] = useState("");
  const [amountEth, setAmountEth] = useState("0.01");
  const [txHash, setTxHash] = useState("");

  const ethToWei = (eth) => {
    const [whole, frac=""] = eth.split(".");
    const fracWei = (frac + "0".repeat(18)).slice(0, 18);
    return BigInt(whole || "0") * 10n**18n + BigInt(fracWei || "0");
  };

  const onSend = async () => {
    if (!activeWallet) return;
    const { rawTx } = await buildAndSignEip1559({
      to,
      valueWei: ethToWei(amountEth),
    });
    const hash = await sendRawTransaction(rawTx);
    setTxHash(hash);
  };

  return (
    <div className="space-y-3">
      <div className="text-sm">From: <span className="font-mono">{activeWallet?.address}</span></div>
      <Input placeholder="0xRecipient…" value={to} onChange={(e) => setTo(e.target.value)} />
      <Input placeholder="Amount in ETH" value={amountEth} onChange={(e) => setAmountEth(e.target.value)} />
      <Button onClick={onSend}>Send</Button>
      {txHash && <div className="text-xs font-mono break-all">tx: {txHash}</div>}
    </div>
  );
}
