import React, { useMemo, useState } from "react";
import { useWallet } from "../context/WalletContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { makeRpc, manualEstimateGas, erc20TransferCalldata } from "../context/utils/tx-ec";

function fmtUnits(raw, decimals) {
  try {
    const s = BigInt(raw || "0").toString();
    const d = Number(decimals || 0);
    if (d <= 0) return s;
    if (s.length <= d) {
      const z = "0".repeat(d - s.length);
      const frac = (z + s).replace(/0+$/, "");
      return frac ? `0.${frac}` : "0";
    }
    const whole = s.slice(0, s.length - d);
    const frac = s.slice(s.length - d).replace(/0+$/, "");
    return frac ? `${whole}.${frac}` : whole;
  } catch { return "0"; }
}

function toBaseUnits(amountStr, decimals) {
  const [w, f = ""] = (amountStr || "").trim().split(".");
  const d = Math.max(0, Number(decimals || 0));
  const frac = (f + "0".repeat(d)).slice(0, d);
  const whole = (w || "0").replace(/^0+/, "") || "0";
  const s = whole + frac;
  return BigInt(s || "0");
}

export default function TokenTransfer({ chain = "sepolia" }) {
  const {
    activeId,
    activeWallet,
    selectedAccount,
    sendErc20FromAccount,
  } = useWallet();

  const tokensForChain = useMemo(
    () => (selectedAccount?.tokens || []).filter(t => t.chain === chain),
    [selectedAccount?.tokens, chain]
  );

  const [tokenAddr, setTokenAddr] = useState(tokensForChain[0]?.address || "");
  const tokenMeta = useMemo(
    () => tokensForChain.find(t => t.address.toLowerCase() === (tokenAddr || "").toLowerCase()),
    [tokensForChain, tokenAddr]
  );
  const decimals = tokenMeta?.decimals ?? null;
  const symbol = tokenMeta?.symbol ?? "TKN";
  const balanceKey = tokenMeta ? `${chain}:${tokenMeta.address.toLowerCase()}` : null;
  const rawBalance = balanceKey ? (selectedAccount?.balances?.[balanceKey] || "0") : "0";

  const [recipient, setRecipient] = useState("");
  const [humanAmt, setHumanAmt] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function onSend() {
    try {
      setBusy(true); setMsg("");
      if (!activeWallet || !selectedAccount) throw new Error("Select an account");
      if (!tokenAddr || !decimals?.toString) throw new Error("Choose an imported token");
      if (!/^0x[0-9a-fA-F]{40}$/.test(recipient)) throw new Error("Recipient must be a valid 0x address");
      if (!password || password.length < 6) throw new Error("Enter wallet password");

      // convert human -> base units using token decimals
      const amount = toBaseUnits(humanAmt, decimals);
      if (amount <= 0n) throw new Error("Amount must be > 0");

      const res = await sendErc20FromAccount({
        chain,
        walletId: activeId,
        password,
        index: activeWallet.activeAccountIndex,
        token: tokenAddr,
        to: recipient,
        amount, // base units (BigInt)
      });

      setMsg(`Broadcasted: ${res.acceptedHash}`);
      setHumanAmt("");
      setPassword("");
    } catch (e) {
      setMsg(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function previewGas() {
    try {
        if (!selectedAccount) throw new Error("Select an account");
        if (!tokenMeta) throw new Error("Choose an imported token");
        const rpcUrl = chain === "holesky" ? import.meta.env.VITE_HOLESKY_RPC : import.meta.env.VITE_SEPOLIA_RPC;
        const rpc = makeRpc(rpcUrl);
        const data = erc20TransferCalldata(recipient, toBaseUnits(humanAmt, tokenMeta.decimals));
        const est = await manualEstimateGas(rpc, {
        from: selectedAccount.address,
        to: tokenMeta.address,
        data,
        value: 0n,
        });
        setMsg(`Estimated gas: ${est.toString()}`);
    } catch (e) {
        setMsg(e.message || String(e));
    }
    }

  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-center gap-2">
          <Label className="w-28">Token</Label>
          <select
            className="border rounded px-2 py-1 flex-1 font-mono"
            value={tokenAddr}
            onChange={(e) => setTokenAddr(e.target.value)}
          >
            {tokensForChain.length === 0 && <option value="">(no imported tokens)</option>}
            {tokensForChain.map(t => (
              <option key={t.address} value={t.address}>
                {t.symbol} · {t.address.slice(0, 6)}…{t.address.slice(-4)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Label className="w-28">Recipient</Label>
          <Input
            placeholder="0x…"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Label className="w-28">Amount</Label>
          <Input
            placeholder={`e.g. 0.01 ${symbol}`}
            value={humanAmt}
            onChange={(e) => setHumanAmt(e.target.value)}
          />
        </div>

        <div className="text-xs opacity-70 ml-28">
          {tokenMeta ? (
            <>
              Decimals: {decimals} · Available: {fmtUnits(rawBalance, decimals)} {symbol}
              {humanAmt && <> · Base units: {toBaseUnits(humanAmt, decimals).toString()}</>}
            </>
          ) : (
            <>Pick an imported token (add it in BalanceCard)</>
          )}
        </div>

        <Separator />

        <div className="flex items-center gap-2">
          <Label className="w-28">Password</Label>
          <Input
            type="password"
            placeholder="Wallet password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button disabled={busy} onClick={onSend}>
            {busy ? "Sending…" : "Send Token"}
          </Button>
          <Button variant="outline" disabled={busy} onClick={previewGas}>Preview Gas</Button>
        </div>

        {!!msg && <div className="text-xs font-mono break-all">{msg}</div>}
      </CardContent>
    </Card>
  );
}