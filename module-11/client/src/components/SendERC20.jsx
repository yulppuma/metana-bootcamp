// src/components/SendERC20.jsx
import { useState } from "react";
import { useWallet } from "@/context/WalletContext";

// shadcn/ui
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SendERC20() {
  const {
    activeWallet,
    getTokenDecimals,
    getERC20Balance,
    sendERC20,
    formatByDecimals,
  } = useWallet();

  const [token, setToken] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("1");

  const [decimals, setDecimals] = useState(null);
  const [balance, setBalance] = useState(null);

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [err, setErr] = useState("");

  const isAddress = (a) => /^0x[0-9a-fA-F]{40}$/.test(a || "");
  const canSend =
    activeWallet &&
    isAddress(token) &&
    isAddress(to) &&
    amount &&
    Number(amount) >= 0 &&
    !sending;

  const onGetDecimals = async () => {
    try {
      setErr("");
      setLoading(true);
      const d = await getTokenDecimals(token);
      setDecimals(d);
    } catch (e) {
      setErr(e.message || "Failed to fetch decimals");
    } finally {
      setLoading(false);
    }
  };

  const onGetBalance = async () => {
    try {
      if (!activeWallet) return;
      setErr("");
      setLoading(true);
      const bal = await getERC20Balance(token, activeWallet.address);
      setBalance(bal);
    } catch (e) {
      setErr(e.message || "Failed to fetch balance");
    } finally {
      setLoading(false);
    }
  };

  const onSend = async () => {
    try {
      setErr("");
      setTxHash("");
      setSending(true);
      const { txHash } = await sendERC20({
        tokenAddress: token,
        to,
        amountHuman: amount,
        decimals, // optional; if null, the context will fetch it
      });
      setTxHash(txHash);
    } catch (e) {
      setErr(e.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="panel">
      <CardHeader>
        <CardTitle className="text-lg">Send ERC-20</CardTitle>
        <CardDescription>
          Minimal UI. All encoding/signing/sending is handled by context.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Token contract */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Token contract</label>
          <Input
            className="font-mono text-sm"
            placeholder="0x… (ERC-20 address)"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Button variant="outline" onClick={onGetDecimals} disabled={!isAddress(token) || loading}>
            {loading ? "Loading…" : "Get decimals"}
          </Button>
          <Button
            variant="outline"
            onClick={onGetBalance}
            disabled={!activeWallet || !isAddress(token) || loading}
          >
            {loading ? "Loading…" : "Get my balance"}
          </Button>
          <div className="text-sm text-muted-foreground flex items-center flex-wrap gap-3">
            {decimals != null && (
              <span>
                decimals: <span className="font-mono">{decimals}</span>
              </span>
            )}
            {balance != null && decimals != null && (
              <span>
                balance:{" "}
                <span className="font-mono">
                  {formatByDecimals(balance, decimals)}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Recipient */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Recipient</label>
          <Input
            className="font-mono text-sm"
            placeholder="0x… (recipient)"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>

        {/* Amount */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Amount</label>
          <Input
            className="font-mono text-sm"
            placeholder="e.g. 1.5"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        {/* Feedback */}
        {err && <div className="text-sm text-red-600">{err}</div>}
        {txHash && (
          <div className="text-xs text-muted-foreground break-all">
            Sent! tx hash: <span className="font-mono">{txHash}</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="justify-end">
        <Button onClick={onSend} disabled={!canSend}>
          {sending ? "Sending…" : "Send"}
        </Button>
      </CardFooter>
    </Card>
  );
}
