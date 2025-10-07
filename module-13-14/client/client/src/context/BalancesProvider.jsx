import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { formatUnits, isAddress, parseAbiItem, createPublicClient, http } from "viem";
import { ERC20_ABI } from "../utils/erc20Abi";
import { TOKENS_BY_CHAIN } from "../utils/tokenList";
import { sepolia } from "viem/chains";
import { CONTRACT_ADDRESSES } from "./chainConfig";
import { getUsdFeedForSymbol } from "../utils/feeds";

// Topic-filtered ERC-20 Transfer
const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)"
);

// Log scan settings
const SAFETY_CONFIRMATIONS = 6n;   // avoid tip
const DISCOVERY_WINDOW   = 80000n; // how far back to scan on refresh
const DISCOVERY_CHUNK    = 2000n;  // blocks per slice

const Bctx = createContext({
  balances: [],           // [{symbol, address, decimals, balanceRaw, balance, isEth, unitUsdNow, totalUsdNow}]
  loading: false,
  refreshBalances: async () => {},
});

export const useBalances = () => useContext(Bctx);

export function BalancesProvider({ children }) {
  const { address: owner, chainId } = useAccount();
  const publicClient = usePublicClient();

  const logsClient = React.useMemo(() => {
    const cid = (chainId || 11155111);
    if (cid === 11155111) {
      const url = import.meta.env.VITE_SEPOLIA_LOGS_RPC || "https://sepolia.drpc.org";
      return createPublicClient({ chain: sepolia, transport: http(url) });
    }
    // fallback: use wagmi's client
    return publicClient;
  }, [chainId, publicClient]);

  const resolvedChainId = chainId || 11155111;
  const tokenList = TOKENS_BY_CHAIN[resolvedChainId] || [];

  // MyPriceFeed address for this chain
  const myPriceFeed = (CONTRACT_ADDRESSES[resolvedChainId] || CONTRACT_ADDRESSES[11155111])?.MyPriceFeed;

  const [loading, setLoading] = useState(false);
  const [balances, setBalances] = useState([]);
  const latestRef = useRef({ owner, chainId: resolvedChainId });
  useEffect(() => { latestRef.current = { owner, chainId: resolvedChainId }; }, [owner, resolvedChainId]);

  async function pageTransferLogsForOwner(owner, from, to) {
    const addrs = new Set();
    if (!owner) return addrs;

    for (let cur = from; cur <= to; ) {
      const hi = cur + DISCOVERY_CHUNK - 1n <= to ? cur + DISCOVERY_CHUNK - 1n : to;

      try {
        const [sent, received] = await Promise.all([
          logsClient.getLogs({
            event: TRANSFER_EVENT,
            args: { from: owner },
            fromBlock: cur,
            toBlock: hi,
          }),
          logsClient.getLogs({
            event: TRANSFER_EVENT,
            args: { to: owner },
            fromBlock: cur,
            toBlock: hi,
          }),
        ]);
        // collect token contract addresses (log.address is the token)
        for (const l of sent) addrs.add(l.address.toLowerCase());
        for (const l of received) addrs.add(l.address.toLowerCase());
      } catch {}

      cur = hi + 1n;
    }
    return addrs;
  }

  // ---------- Price fetching (batch + per-feed fallback) ----------
  async function fetchNowPrices(feeds) {
    if (!Array.isArray(feeds) || feeds.length === 0) return new Map();
    if (!isAddress(myPriceFeed || "")) return new Map();

    // Try batch first
    try {
      // MyPriceFeed.getBatchDataFeed(address[] feeds) returns (int256[] answers, uint8[] decimals)
      const [answers, decs] = await publicClient.readContract({
        address: myPriceFeed,
        abi: [
          {
            "inputs":[{"internalType":"address[]","name":"feeds","type":"address[]"}],
            "name":"getBatchDataFeed",
            "outputs":[{"internalType":"int256[]","name":"","type":"int256[]"},{"internalType":"uint8[]","name":"","type":"uint8[]"}],
            "stateMutability":"view",
            "type":"function"
          }
        ],
        functionName: "getBatchDataFeed",
        args: [feeds],
      });
      const m = new Map();
      for (let i = 0; i < feeds.length; i++) {
        const unit = Number(answers[i]) / 10 ** Number(decs[i]);
        m.set(String(feeds[i]).toLowerCase(), unit);
      }
      return m;
    } catch {
      // Fallback: per-feed calls
      const settled = await Promise.allSettled(
        feeds.map((f) =>
          publicClient
            .readContract({
              address: myPriceFeed,
              abi: [
                {
                  "inputs":[{"internalType":"address","name":"feed","type":"address"}],
                  "name":"getDataFeed",
                  "outputs":[{"internalType":"int256","name":"","type":"int256"},{"internalType":"uint8","name":"","type":"uint8"}],
                  "stateMutability":"view",
                  "type":"function"
                }
              ],
              functionName: "getDataFeed",
              args: [f],
            })
            .then(([ans, dec]) => [String(f).toLowerCase(), Number(ans) / 10 ** Number(dec)])
        )
      );
      const m = new Map();
      for (const s of settled) {
        if (s.status === "fulfilled") {
          const [key, val] = s.value;
          m.set(key, val);
        }
      }
      return m;
    }
  }

  const refreshBalances = async () => {
    if (!owner || !publicClient) { setBalances([]); return; }
    setLoading(true);
    try {
      // 1) ETH balance
      const wei = await publicClient.getBalance({ address: owner }).catch(() => 0n);
      const ethBalance = Number(formatUnits(wei, 18));
      const rows = [];
      if (wei > 0n) {
        rows.push({
          symbol: "ETH",
          address: "ETH",
          decimals: 18,
          balanceRaw: wei,
          balance: ethBalance,
          isEth: true,
        });
      }

      // 2) Discover token contracts by scanning recent Transfer logs (to/from you)
      let tip;
      try { tip = await publicClient.getBlockNumber(); } catch { tip = 0n; }
      const safeTip = tip > SAFETY_CONFIRMATIONS ? tip - SAFETY_CONFIRMATIONS : tip;
      const from = safeTip > DISCOVERY_WINDOW ? safeTip - DISCOVERY_WINDOW : 0n;

      const discovered = await pageTransferLogsForOwner(owner, from, safeTip);
      const tokenAddrs = Array.from(discovered);

      if (tokenAddrs.length) {
        // 3) Multicall balances
        const balanceCalls = tokenAddrs.map((addr) => ({
          address: addr,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [owner],
        }));
        const balanceRes = await publicClient.multicall({ contracts: balanceCalls }).catch(() => null);

        // Keep only >0 balances
        const positives = [];
        if (balanceRes) {
          for (let i = 0; i < tokenAddrs.length; i++) {
            const addr = tokenAddrs[i];
            const r = balanceRes[i];
            const ok = r && r.status === "success" && typeof r.result === "bigint";
            const bal = ok ? r.result : 0n;
            if (bal > 0n) positives.push({ address: addr, balanceRaw: bal });
          }
        }

        // 4) Metadata (symbol & decimals) via multicall, only for positives
        if (positives.length) {
          const metaCalls = [];
          for (const p of positives) {
            metaCalls.push({ address: p.address, abi: ERC20_ABI, functionName: "symbol" });
            metaCalls.push({ address: p.address, abi: ERC20_ABI, functionName: "decimals" });
          }
          const metaRes = await publicClient.multicall({ contracts: metaCalls }).catch(() => null);

          for (let i = 0; i < positives.length; i++) {
            const addr = positives[i].address;
            const balRaw = positives[i].balanceRaw;

            let symbol = "TOKEN";
            let decimals = 18;

            if (metaRes) {
              const symIdx = 2 * i;
              const decIdx = 2 * i + 1;
              const symR = metaRes[symIdx];
              const decR = metaRes[decIdx];
              if (symR?.status === "success" && typeof symR.result === "string") symbol = symR.result;
              if (decR?.status === "success") decimals = Number(decR.result);
            }

            rows.push({
              symbol,
              address: addr,
              decimals,
              balanceRaw: balRaw,
              balance: Number(formatUnits(balRaw, decimals)),
              isEth: false,
            });
          }
        }
      }

      // 5) Attach USD pricing (ETH + each token, if we have a feed)
      const feeds = new Set();
      // ETH baseline
      const ethUsd = getUsdFeedForSymbol("ETH");
      if (isAddress(ethUsd || "")) feeds.add(String(ethUsd).toLowerCase());
      // Tokens by symbol
      for (const r of rows) {
        const f = getUsdFeedForSymbol(r.symbol);
        if (isAddress(f || "")) feeds.add(String(f).toLowerCase());
      }

      let priceMap = new Map();
      if (feeds.size > 0) {
        priceMap = await fetchNowPrices(Array.from(feeds));
      }

      const withUsd = rows.map((r) => {
        const f = getUsdFeedForSymbol(r.symbol);
        const key = isAddress(f || "") ? String(f).toLowerCase() : null;
        const unitUsdNow = key ? priceMap.get(key) ?? null : null;
        const totalUsdNow = unitUsdNow != null ? r.balance * unitUsdNow : null;
        return { ...r, unitUsdNow, totalUsdNow };
      });

      // 6) Sort by balance desc and publish
      withUsd.sort((a, b) => b.balance - a.balance);
      setBalances(withUsd);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh when wallet/chain changes
  useEffect(() => {
    if (!owner) { setBalances([]); return; }
    refreshBalances();
  }, [owner, resolvedChainId]);

  const value = useMemo(() => ({ balances, loading, refreshBalances }), [balances, loading]);
  return <Bctx.Provider value={value}>{children}</Bctx.Provider>;
}
