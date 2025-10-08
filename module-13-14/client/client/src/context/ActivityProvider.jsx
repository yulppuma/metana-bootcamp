import React, {createContext, useContext, useEffect, useMemo, useRef, useState,} from "react";
import { useAccount, usePublicClient } from "wagmi";
import { CONTRACT_ADDRESSES } from "./chainConfig";
import MyPriceFeedArtifact from "../utils/MyPriceFeed.json";
import { ERC20_ABI } from "../utils/erc20Abi";
import {
  isAddress,
  formatUnits,
  parseAbiItem,
  createPublicClient,
  http,
} from "viem";
import { sepolia } from "viem/chains";
import { decodeEventLog } from "viem";
import { getUsdFeedForSymbol } from "../utils/feeds";

const MyPriceFeedAbi = Array.isArray(MyPriceFeedArtifact?.abi)
  ? MyPriceFeedArtifact.abi
  : MyPriceFeedArtifact;

const PAYMENT_STAMPED = parseAbiItem(
  "event PaymentStamped(address indexed payer, address indexed payee, address indexed asset, uint256 amount, string memo, address feed, int256 price, uint8 priceDecimals, uint256 updatedAt)"
);

const ZERO = "0x0000000000000000000000000000000000000000";

// knobs
const SAFETY_CONFIRMATIONS = 6n;
const CHUNK = 2048n;
const SEED_WINDOW = 8192n;

const Actx = createContext({
  items: [],
  refreshUsdNow: async () => {},
  nowRefreshing: false,
  nowMeta: { updatedAt: null },
  loadOlderHistory: async () => {},
  loadingOlder: false,
  canLoadOlder: true,
});
export const useActivity = () => useContext(Actx);

export function ActivityProvider({ children }) {
  const { chainId, address: owner } = useAccount();
  const ownerLc = owner ? owner.toLowerCase() : null;
  const publicClient = usePublicClient();

  const resolvedChainId = chainId || 11155111; // Sepolia fallback
  const current =
    CONTRACT_ADDRESSES[resolvedChainId] || CONTRACT_ADDRESSES[11155111];

  const myScan = current?.MyScan;
  const myPriceFeed = current?.MyPriceFeed;
  const myScanStartBlock =
    current?.MyScanStartBlock != null ? BigInt(current.MyScanStartBlock) : 0n;

  // logs client
  const logsClient = useMemo(() => {
    if (resolvedChainId === 11155111) {
      const url =
        import.meta.env.VITE_SEPOLIA_LOGS_RPC || "https://sepolia.drpc.org";
      return createPublicClient({ chain: sepolia, transport: http(url) });
    }
    return publicClient;
  }, [resolvedChainId, publicClient]);

  const [items, setItems] = useState([]);
  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);

  // token metadata cache
  const tokenMetaRef = useRef({});

  const [nowRefreshing, setNowRefreshing] = useState(false);
  const [nowMeta, setNowMeta] = useState({ updatedAt: null });

  const lastFetchedBlockRef = useRef(null);   // bigint
  const earliestSeenBlockRef = useRef(null);  // bigint
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [canLoadOlder, setCanLoadOlder] = useState(true);

  // Always clear on mount (and because App.jsx remounts us on wallet/chain change)
  useEffect(() => {
    setItems([]);
    itemsRef.current = [];
    tokenMetaRef.current = {};
    lastFetchedBlockRef.current = null;
    earliestSeenBlockRef.current = null;
    setNowMeta({ updatedAt: null });
  }, []); // remount = reset

  const sortNewestFirst = (list) =>
    [...list].sort((a, b) => {
      if (b.blockNumber !== a.blockNumber) return b.blockNumber - a.blockNumber;
      return b.logIndex - a.logIndex;
    });

  async function shapeEvent(evt) {
    const a = evt.args || {};
    return {
      txHash: evt.transactionHash,
      logIndex: Number(evt.logIndex ?? 0),
      blockNumber: evt.blockNumber ? Number(evt.blockNumber) : 0,

      payer: a.payer ?? a.from ?? null,
      payee: a.payee ?? a.to ?? null,
      asset: a.asset ?? ZERO,
      amount:
        typeof a.amount === "bigint" ? a.amount :
        a.amount != null ? BigInt(a.amount) : 0n,
      memo: typeof a.memo === "string" ? a.memo : "",
      feed: a.feed ?? null,
      price:
        typeof a.price === "bigint" ? a.price :
        a.price != null ? BigInt(a.price) : 0n,
      priceDecimals: a.priceDecimals ?? a.decimals ?? null,
      updatedAt:
        a.updatedAt != null ? Number(a.updatedAt) :
        a.timestamp  != null ? Number(a.timestamp)  : null,

      assetSymbol: null,
      assetDecimals: null,
      amountStr: null,
      amountNum: null,
      unitUsdThen: null,
      totalUsdThen: null,
      unitUsdNow: null,
      totalUsdNow: null,
    };
  }

  // Decode & append a just-mined PaymentStamped from a tx hash
  async function ingestTx(txHash) {
    try {
      if (!isAddress(myScan || "")) return false;

      const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
      if (!receipt || !Array.isArray(receipt.logs)) return false;

      const myAddr = String(myScan).toLowerCase();
      const hits = [];

      for (const log of receipt.logs) {
        if (!log || String(log.address).toLowerCase() !== myAddr) continue;

        try {
          const decoded = decodeEventLog({
            abi: [PAYMENT_STAMPED],
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName !== "PaymentStamped") continue;

          hits.push({
            transactionHash: receipt.transactionHash,
            blockNumber: receipt.blockNumber,
            logIndex: log.logIndex,
            args: decoded.args,
          });
        } catch {}
      }

      if (!hits.length) return false;

      const shaped = await Promise.all(hits.map(shapeEvent));
      const enriched = await enrichRows(shaped);

      setItems((prev) => {
        const map = new Map(prev.map((r) => [`${r.txHash}-${r.logIndex}`, r]));
        for (const r of enriched) map.set(`${r.txHash}-${r.logIndex}`, r);
        return sortNewestFirst(Array.from(map.values())).slice(0, 400);
      });

      if (receipt.blockNumber != null) {
        const bn = receipt.blockNumber;
        if (lastFetchedBlockRef.current == null || bn > lastFetchedBlockRef.current) {
          lastFetchedBlockRef.current = bn;
        }
        if (earliestSeenBlockRef.current == null || bn < earliestSeenBlockRef.current) {
          earliestSeenBlockRef.current = bn;
        }
      }
      refreshUsdNow?.();
      return true;
    } catch {
      return false;
    }
  }

  async function fetchTokenMeta(addr) {
    const L = addr.toLowerCase();
    if (tokenMetaRef.current[L]) return tokenMetaRef.current[L];
    const [symbol, decimals] = await Promise.all([
      publicClient.readContract({ address: addr, abi: ERC20_ABI, functionName: "symbol" }).catch(() => "TOKEN"),
      publicClient.readContract({ address: addr, abi: ERC20_ABI, functionName: "decimals" }).catch(() => 18),
    ]);
    tokenMetaRef.current[L] = { symbol, decimals: Number(decimals) };
    return tokenMetaRef.current[L];
  }

  async function enrichRows(rawRows) {
    if (!Array.isArray(rawRows) || rawRows.length === 0) return [];

    const uniq = new Set(
      rawRows
        .map((r) => (r.asset && r.asset !== ZERO ? r.asset.toLowerCase() : null))
        .filter(Boolean)
    );
    const metaFetches = [];
    for (const t of uniq) if (!tokenMetaRef.current[t]) metaFetches.push(fetchTokenMeta(t));
    if (metaFetches.length) await Promise.allSettled(metaFetches);

    return rawRows.map((r) => {
      const isEth = !r.asset || String(r.asset).toLowerCase() === ZERO;
      const meta = isEth ? { symbol: "ETH", decimals: 18 }
                         : tokenMetaRef.current[String(r.asset).toLowerCase()] || { symbol: "TOKEN", decimals: 18 };

      const amountStr = formatUnits(r.amount, meta.decimals);
      const amountNum = Number(amountStr);

      const unitUsdThen =
        r.priceDecimals != null ? Number(r.price) / 10 ** Number(r.priceDecimals) : null;
      const totalUsdThen = unitUsdThen != null ? amountNum * unitUsdThen : null;

      return { ...r, assetSymbol: meta.symbol, assetDecimals: meta.decimals, amountStr, amountNum, unitUsdThen, totalUsdThen };
    });
  }

  // ---------- Topic-filtered paging for wallet (fast) ----------
  async function pageLogsMine(ownerAddr, from, to) {
    const out = [];
    if (!isAddress(myScan || "") || !isAddress(ownerAddr || "")) return out;
    if (from > to) return out;

    for (let cur = from; cur <= to; ) {
      const hi = cur + CHUNK - 1n <= to ? cur + CHUNK - 1n : to;

      try {
        const [pLogs, qLogs] = await Promise.all([
          logsClient.getLogs({
            address: myScan,
            event: PAYMENT_STAMPED,
            args: { payer: ownerAddr },   // topic[1] = owner
            fromBlock: cur,
            toBlock: hi,
          }),
          logsClient.getLogs({
            address: myScan,
            event: PAYMENT_STAMPED,
            args: { payee: ownerAddr },   // topic[2] = owner
            fromBlock: cur,
            toBlock: hi,
          }),
        ]);
        const merged = [...pLogs, ...qLogs];
        if (merged.length) {
          const map = new Map(merged.map(l => [`${l.transactionHash}-${String(l.logIndex)}`, l]));
          out.push(...Array.from(map.values()));
        }
      } catch {}

      cur = hi + 1n;
    }

    return out;
  }

  // ---------- Init & poll forward ----------
  useEffect(() => {
    if (!isAddress(myScan || "") || !isAddress(owner || "")) { setItems([]); return; }

    let stopped = false;
    let pollId;

    async function init() {
      let tip;
      try { tip = await publicClient.getBlockNumber(); } catch { tip = 0n; }
      const safeTip = tip > SAFETY_CONFIRMATIONS ? tip - SAFETY_CONFIRMATIONS : tip;

      const from = safeTip > SEED_WINDOW ? safeTip - SEED_WINDOW : myScanStartBlock;

      try {
        const raw = await pageLogsMine(owner, from, safeTip);
        const shaped = await Promise.all(raw.map(shapeEvent));
        const enriched = await enrichRows(sortNewestFirst(shaped).slice(0, 200));
        if (!stopped) setItems(enriched);

        const minBlock = enriched.length
          ? BigInt(enriched[enriched.length - 1].blockNumber)
          : safeTip;
        earliestSeenBlockRef.current = minBlock > myScanStartBlock ? minBlock : myScanStartBlock;
        setCanLoadOlder(earliestSeenBlockRef.current > myScanStartBlock);
      } catch {
        if (!stopped) setItems([]);
        earliestSeenBlockRef.current = safeTip;
      }

      lastFetchedBlockRef.current = safeTip;

      async function poll() {
        if (stopped) return;

        let currentTip;
        try { currentTip = await publicClient.getBlockNumber(); } catch { return; }
        const safeTipNow = currentTip > SAFETY_CONFIRMATIONS ? currentTip - SAFETY_CONFIRMATIONS : currentTip;

        const last = lastFetchedBlockRef.current ?? (safeTipNow - 1n);
        if (safeTipNow <= last) return;

        const fromFwd = last + 1n;
        try {
          const raw = await pageLogsMine(owner, fromFwd, safeTipNow);
          if (raw.length > 0) {
            const shaped = await Promise.all(raw.map(shapeEvent));
            const enrichedFresh = await enrichRows(sortNewestFirst(shaped));
            setItems((prev) => {
              const map = new Map(prev.map((r) => [`${r.txHash}-${r.logIndex}`, r]));
              for (const r of enrichedFresh) map.set(`${r.txHash}-${r.logIndex}`, r);
              return sortNewestFirst(Array.from(map.values())).slice(0, 400);
            });
          }
        } catch {
        } finally {
          lastFetchedBlockRef.current = safeTipNow;
        }
      }

      await poll();
      pollId = setInterval(poll, 5000);
    }

    const t = setTimeout(init, 0);
    return () => { clearTimeout(t); if (pollId) clearInterval(pollId); };
  }, [myScan, myPriceFeed, publicClient, logsClient, owner]);

  // ---------- Robust USD “Now” refresh (batch + per-feed fallback) ----------
  async function fetchNowPrices(feeds) {
    if (!Array.isArray(feeds) || feeds.length === 0) return new Map();
    const feedsLc = feeds.map(f => String(f).toLowerCase());
    try {
      const [answers, decs] = await publicClient.readContract({
        address: myPriceFeed,
        abi: MyPriceFeedAbi,
        functionName: "getBatchDataFeed",
        args: [feedsLc],
      });
      const m = new Map();
      for (let i = 0; i < feedsLc.length; i++) {
        const unit = Number(answers[i]) / 10 ** Number(decs[i]);
        m.set(feedsLc[i], unit);
      }
      return m;
    } catch {
      const settled = await Promise.allSettled(
        feedsLc.map((f) =>
          publicClient
            .readContract({
              address: myPriceFeed,
              abi: MyPriceFeedAbi,
              functionName: "getDataFeed",
              args: [f],
            })
            .then(([ans, dec]) => [f, Number(ans) / 10 ** Number(dec)])
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

  const refreshUsdNow = async () => {
    if (!isAddress(myPriceFeed || "")) return;
    if (nowRefreshing) return;
    setNowRefreshing(true);
    try {
      const rows = itemsRef.current;
      const rowFeeds = Array.from(
        new Set(
          rows
            .map((r) => (r.feed && isAddress(r.feed) ? String(r.feed).toLowerCase() : null))
            .filter(Boolean)
        )
      );
      const ethUsd = getUsdFeedForSymbol("ETH");
      const baseline = isAddress(ethUsd) ? [String(ethUsd).toLowerCase()] : [];
      const feeds = Array.from(new Set([...baseline, ...rowFeeds]));
      if (feeds.length === 0) { setNowMeta({ updatedAt: Date.now() }); return; }
      const nowMap = await fetchNowPrices(feeds);
      setItems((prev) =>
        prev.map((r) => {
          const key = r.feed ? String(r.feed).toLowerCase() : null;
          const unitUsdNow = key ? nowMap.get(key) ?? null : null;
          const totalUsdNow =
            unitUsdNow != null && r.amountNum != null ? r.amountNum * unitUsdNow : null;
          return { ...r, unitUsdNow, totalUsdNow };
        })
      );

      const ethUsdKey = baseline[0] || null;
      const ethUsdVal = ethUsdKey ? nowMap.get(ethUsdKey) ?? null : null;

      setNowMeta({ updatedAt: Date.now(), ethUsd: ethUsdVal });
    } finally {
      setNowRefreshing(false);
    }
  };

  // Boot-time refresh so ETH/USD shows immediately
  useEffect(() => {
    if (isAddress(myPriceFeed || "")) {
      refreshUsdNow();
    }
  }, [myPriceFeed]);

  // ---------- Auto-refresh “Now” after items load/change ----------
  const lastFeedsKeyRef = useRef("");
  useEffect(() => {
    const rows = itemsRef.current;
    if (!rows || rows.length === 0) return;
    const feeds = Array.from(
      new Set(
        rows
          .map((r) => (r.feed && isAddress(r.feed) ? String(r.feed).toLowerCase() : null))
          .filter(Boolean)
      )
    ).sort();
    const key = feeds.join(",");
    if (key && key !== lastFeedsKeyRef.current) {
      lastFeedsKeyRef.current = key;
      refreshUsdNow();
    }
  }, [items.length]);

  // ---------- Manual: Load older ----------
  const loadingOlderRef = useRef(false);
  const loadOlderHistory = async (blocksWindow = 12288n) => {
    if (loadingOlderRef.current || loadingOlder) return;
    if (!isAddress(myScan || "") || !isAddress(owner || "")) return;

    let earliest = earliestSeenBlockRef.current;
    if (earliest == null) {
      try {
        const tip = await publicClient.getBlockNumber();
        earliest = tip > SAFETY_CONFIRMATIONS ? tip - SAFETY_CONFIRMATIONS : tip;
      } catch {
        earliest = 0n;
      }
    }
    if (earliest <= myScanStartBlock) { setCanLoadOlder(false); return; }

    setLoadingOlder(true);
    loadingOlderRef.current = true;
    try {
      const to = earliest - 1n;
      const from = to > blocksWindow ? to - blocksWindow : myScanStartBlock;

      const raw = await pageLogsMine(owner, from, to);
      const shaped = await Promise.all(raw.map(shapeEvent));
      const enriched = await enrichRows(sortNewestFirst(shaped));

      setItems((prev) => {
        const map = new Map(prev.map((r) => [`${r.txHash}-${r.logIndex}`, r]));
        for (const r of enriched) map.set(`${r.txHash}-${r.logIndex}`, r);
        const merged = sortNewestFirst(Array.from(map.values())).slice(0, 600);
        const tail = merged[merged.length - 1];
        earliestSeenBlockRef.current = tail ? BigInt(tail.blockNumber) : from;
        setCanLoadOlder(earliestSeenBlockRef.current > myScanStartBlock);
        return merged;
      });
    } finally {
      setLoadingOlder(false);
      loadingOlderRef.current = false;
    }
  };

  const value = useMemo(
    () => ({
      items,
      refreshUsdNow,
      nowRefreshing,
      nowMeta,
      loadOlderHistory,
      loadingOlder,
      canLoadOlder,
      ingestTx
    }),
    [items, nowRefreshing, nowMeta, loadingOlder, canLoadOlder]
  );

  return <Actx.Provider value={value}>{children}</Actx.Provider>;
}
