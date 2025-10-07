// Utility helpers around your feeds.json mapping
import FEEDS from "./feeds.json";

// ETH/USD aggregator address (0x.. or null)
export function getEthUsdFeed() {
  return FEEDS["ETH / USD"] ?? null;
}

// Try to find "<SYM> / USD" in feeds.json (e.g., "USDC / USD", "DAI / USD")
export function getUsdFeedForSymbol(symbol) {
  if (!symbol) return null;
  const key = `${String(symbol).toUpperCase()} / USD`;
  return FEEDS[key] ?? null;
}
