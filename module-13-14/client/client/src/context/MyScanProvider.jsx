import React, { createContext, useContext, useMemo } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { parseUnits, isAddress, maxUint256 } from "viem";

import { CONTRACT_ADDRESSES } from "./chainConfig";
import MyScanArtifact from "../utils/MyScan.json";
import { ERC20_ABI } from "../utils/erc20Abi";

const MyScanAbi = Array.isArray(MyScanArtifact?.abi) ? MyScanArtifact.abi : MyScanArtifact;

const Ctx = createContext(null);
export const useMyScan = () => useContext(Ctx);

export function MyScanProvider({ children }) {
  const publicClient = usePublicClient();
  const { chainId, address: owner } = useAccount();
  const { data: walletClient } = useWalletClient();

  const resolvedChainId = chainId || 11155111; // Sepolia fallback
  const contracts = CONTRACT_ADDRESSES[resolvedChainId] || CONTRACT_ADDRESSES[11155111];
  const myScan = contracts?.MyScan;

  // ---------- ETH send ----------
  async function sendEth({ to, valueEth, memo, feed }) {
    if (!walletClient || !isAddress(myScan)) throw new Error("Wallet or MyScan missing");
    if (!isAddress(to)) throw new Error("Bad recipient");
    const valueWei = parseUnits(String(valueEth), 18);
    const hash = await walletClient.writeContract({
      address: myScan,
      abi: MyScanAbi,
      functionName: "sendEth",
      args: [to, feed, memo || ""],
      value: valueWei,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  // ---------- ERC-20 helpers ----------
  async function getTokenInfo(token) {
    if (!isAddress(token)) throw new Error("Bad token");
    const [symbol, decimals, name] = await Promise.all([
      publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: "symbol" }),
      publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: "decimals" }),
      publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: "name" }).catch(() => null),
    ]);
    return { symbol, decimals: Number(decimals), name };
  }

  async function getBalance(token, user) {
    if (!isAddress(token) || !isAddress(user)) return 0n;
    return publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: "balanceOf", args: [user] });
  }

  async function getAllowance(token, user) {
    if (!isAddress(token) || !isAddress(myScan) || !isAddress(user)) return 0n;
    return publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: "allowance", args: [user, myScan] });
  }

  // Approve max with zero-first fallback (handles USDT-style)
  async function approveMax(token) {
    try {
      const h = await walletClient.writeContract({
        address: token,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [myScan, maxUint256],
      });
      await publicClient.waitForTransactionReceipt({ hash: h });
      return true;
    } catch {
      const h0 = await walletClient.writeContract({
        address: token,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [myScan, 0n],
      });
      await publicClient.waitForTransactionReceipt({ hash: h0 });

      const h1 = await walletClient.writeContract({
        address: token,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [myScan, maxUint256],
      });
      await publicClient.waitForTransactionReceipt({ hash: h1 });
      return true;
    }
  }

  // Transfer via MyScan
  async function transferToken({ token, to, amount, memo, feed }) {
    const decimals = Number(
      await publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: "decimals" })
    );
    const amountWei = parseUnits(String(amount), decimals);

    const hash = await walletClient.writeContract({
      address: myScan,
      abi: MyScanAbi,
      functionName: "transferERC20",
      args: [token, to, amountWei, feed, memo || ""],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  async function sendTokenAuto({ token, to, amount, memo, feed }) {
    if (!walletClient || !isAddress(myScan)) throw new Error("Wallet or MyScan missing");
    if (!isAddress(token)) throw new Error("Bad token address");
    if (!isAddress(to)) throw new Error("Bad recipient");
    if (!isAddress(feed)) throw new Error("Bad Chainlink feed address");
    if (!owner) throw new Error("Connect wallet");

    const { decimals } = await getTokenInfo(token);
    const amountWei = parseUnits(String(amount), decimals);

    // Check current allowance
    const currentAllow = await getAllowance(token, owner);
    if (currentAllow < amountWei) {
      await approveMax(token); // waits for receipts (handles USDT zero-first)
    }

    // Then transfer
    return transferToken({ token, to, amount, memo, feed });
  }

  const value = useMemo(
    () => ({
      myScan,
      owner,
      sendEth,
      getTokenInfo,
      getBalance,
      getAllowance,
      transferToken,
      sendTokenAuto,  
    }),
    [myScan, owner, walletClient, publicClient]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
