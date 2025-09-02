import React, { useEffect, useState } from "react";
import { useWallet } from "../context/WalletContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";


export default function TxPlayground() {
  const {
    activeWallet,
    selectedAccount,
    sendEthFromAccount,
    getAccountPendingNonce,
  } = useWallet();

  const [chain, setChain] = useState("sepolia"); // "sepolia" | "holesky"
  const [to, setTo] = useState("");
  const [valueWei, setValueWei] = useState("100000000000000"); // 0.0001 ether
  const [password, setPassword] = useState("");
  const [nonce, setNonce] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const fromAddr = selectedAccount?.address || "";

  useEffect(() => {
    let ignore = false;
    (async () => {
      setErr("");
      setNonce(null);
      setTxHash(null);
      if (!fromAddr) return;
      try {
        const rpcUrl = chain === "holesky" ? import.meta.env.VITE_HOLESKY_RPC : import.meta.env.VITE_SEPOLIA_RPC;
        const n = await getAccountPendingNonce({ rpcUrl, address: fromAddr });
        if (!ignore) setNonce(n.toString());
      } catch (e) {
        if (!ignore) setErr(e.message || String(e));
      }
    })();
    return () => { ignore = true; };
  }, [chain, fromAddr, getAccountPendingNonce]);

  async function onSendEth(e) {
    e.preventDefault();
    if (!activeWallet || selectedAccount == null) return;
    setBusy(true); setErr(""); setTxHash(null);
    try {
      const rpcUrl = chain === "holesky" ? import.meta.env.VITE_HOLESKY_RPC : import.meta.env.VITE_SEPOLIA_RPC;
      const res = await sendEthFromAccount({
        rpcUrl,
        chain,
        walletId: activeWallet.id,
        password,
        index: activeWallet.activeAccountIndex,
        to,
        valueWei,
      });
      setTxHash(res.acceptedHash);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function refreshNonce() {
    const rpcUrl = chain === "holesky" ? import.meta.env.VITE_HOLESKY_RPC : import.meta.env.VITE_SEPOLIA_RPC;
    const n = await getAccountPendingNonce({ rpcUrl, address: fromAddr });
    setNonce(n.toString());
  }

  const explorerBase = chain === "holesky" ? "https://holesky.etherscan.io/tx/" : "https://sepolia.etherscan.io/tx/";

  const canSend = !!fromAddr && !!to && !!password && !busy;

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl">Send ETH</CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* From + chain selector */}
        <div className="grid gap-4 md:grid-cols-[1fr_auto] items-end">
          <div className="space-y-2">
            <Label>From</Label>
            <Input value={fromAddr} readOnly className="font-mono" placeholder="(select an account)" />
          </div>

          <div className="space-y-2 md:justify-self-end w-full md:w-[220px]">
            <Label>Chain</Label>
            <Select value={chain} onValueChange={setChain}>
              <SelectTrigger>
                <SelectValue placeholder="Select network" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sepolia">Sepolia</SelectItem>
                <SelectItem value="holesky">Holesky</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Nonce row */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="opacity-80">Pending nonce:</span>
          <Badge variant="outline" className="font-mono">{nonce ?? "…"}</Badge>
          <Button type="button" size="sm" variant="secondary" className="gap-2" onClick={refreshNonce}> refresh </Button>
        </div>

        <Separator />

        {/* Form */}
        <form onSubmit={onSendEth} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="to">Recipient</Label>
            <Input
              id="to"
              className="font-mono"
              placeholder="0xRecipient…"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="val">Value (wei)</Label>
            <Input
              id="val"
              className="font-mono"
              placeholder="100000000000000"
              value={valueWei}
              onChange={(e) => setValueWei(e.target.value)}
              inputMode="numeric"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pw">Wallet password</Label>
            <Input
              id="pw"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={!canSend} className="gap-2"> {busy ? "Sending…" : "Send ETH"} </Button>
            <span className="text-xs text-muted-foreground">Chain: {chain}</span>
          </div>
        </form>

        {/* Success / Error */}
        {txHash && (
          <Alert className="mt-2">
            <AlertTitle>Transaction sent</AlertTitle>
            <AlertDescription className="flex items-center gap-2 break-all">
              <a className="underline inline-flex items-center gap-1" href={explorerBase + txHash} target="_blank" rel="noreferrer"> View on Etherscan </a>
            </AlertDescription>
          </Alert>
        )}

        {err && (
          <Alert variant="destructive" className="mt-2">
            <AlertTitle>Failed</AlertTitle>
            <AlertDescription className="whitespace-pre-wrap">{err}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}