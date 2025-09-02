import React, { useState } from "react";
import { useWallet } from "../context/WalletContext";
import {
  erc20TransferCalldata,
  manualEstimateGas,
  buildAndSignEip1559Tx,
  sendRawTransaction,
  makeRpc,
  CHAINS,
  suggest1559Fees,
  getPendingNonce
} from "../context/utils/tx-ec";

export default function TokenTransfer() {
  const { activeWallet, selectedAccount, unlockAccountPrivateKey } = useWallet();
  const [chain, setChain] = useState("sepolia");
  const [token, setToken] = useState(""); // ERC20 address
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("1000000000000000000"); // 1 token in wei-units (decimals=18)
  const [password, setPassword] = useState("");
  const [gasLimit, setGasLimit] = useState("");
  const [txHash, setTxHash] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSend(e) {
    e.preventDefault();
    if (!activeWallet || selectedAccount == null) return;
    setBusy(true); setErr(""); setTxHash(""); setGasLimit("");

    try {
      const rpcUrl =
        chain === "holesky"
          ? import.meta.env.VITE_HOLESKY_RPC
          : import.meta.env.VITE_SEPOLIA_RPC;

      const rpc = makeRpc(rpcUrl);
      const from = selectedAccount.address;
      const privKey = await unlockAccountPrivateKey({
        walletId: activeWallet.id,
        password,
        index: selectedAccount.index,
      });

      const data = erc20TransferCalldata(to, BigInt(amount));
      const est = await manualEstimateGas(rpc, { from, to: token, data });
      setGasLimit(est.toString());

      const nonce = await getPendingNonce(rpc, from);
      const { maxPriorityFeePerGas, maxFeePerGas } = await suggest1559Fees(rpc);

      const { raw, txHash } = buildAndSignEip1559Tx({
        chainId: CHAINS[chain].chainId,
        nonce,
        to: token,
        value: 0n,
        data,
        gasLimit: est,
        maxFeePerGas,
        maxPriorityFeePerGas,
        privKey,
      });

      const accepted = await sendRawTransaction(rpc, raw);
      setTxHash(accepted);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  const explorerBase =
    chain === "holesky"
      ? "https://holesky.etherscan.io/tx/"
      : "https://sepolia.etherscan.io/tx/";

  return (
    <div className="space-y-3 p-4 rounded-xl border">
      <div className="flex gap-2">
        <label className="text-sm">Chain:</label>
        <select className="border rounded px-2 py-1" value={chain} onChange={(e)=>setChain(e.target.value)}>
          <option value="sepolia">Sepolia</option>
          <option value="holesky">Holesky</option>
        </select>
      </div>

      <form onSubmit={onSend} className="space-y-2">
        <input className="w-full border rounded px-2 py-1 font-mono" placeholder="Token (ERC20) address"
          value={token} onChange={(e)=>setToken(e.target.value)} />
        <input className="w-full border rounded px-2 py-1 font-mono" placeholder="Recipient 0x..."
          value={to} onChange={(e)=>setTo(e.target.value)} />
        <input className="w-full border rounded px-2 py-1 font-mono" placeholder="Amount (token units, e.g. 1e18)"
          value={amount} onChange={(e)=>setAmount(e.target.value)} />
        <input type="password" className="w-full border rounded px-2 py-1" placeholder="Wallet password"
          value={password} onChange={(e)=>setPassword(e.target.value)} />
        <button className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
          disabled={busy || !token || !to || !amount || !password}>
          {busy ? "Sending…" : "Send ERC20"}
        </button>
      </form>

      {!!gasLimit && <div className="text-sm">Estimated gas: <b>{gasLimit}</b></div>}
      {!!txHash && (
        <div className="text-sm">
          Sent! Tx:{" "}
          <a className="text-blue-600 underline" href={explorerBase + txHash} target="_blank" rel="noreferrer">
            {txHash}
          </a>
        </div>
      )}
      {!!err && <div className="text-red-600 text-sm">{err}</div>}
    </div>
  );
}