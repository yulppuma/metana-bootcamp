const KEY = "wallet_meta_v1";

function loadMeta() {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
function saveMeta(m) { localStorage.setItem(KEY, JSON.stringify(m)); }

// full meta shape: { [walletId]: { lastCreatedIndex: number } }
export function getWalletMeta(walletId) {
  return loadMeta()[walletId];
}

export function setWalletMeta(walletId, meta) {
  const all = loadMeta();
  all[walletId] = { ...(all[walletId] || {}), ...meta };
  saveMeta(all);
}

export function bumpLastCreatedIndex(walletId, index) {
  const all = loadMeta();
  const curr = all[walletId]?.lastCreatedIndex ?? -1;
  if (index > curr) {
    all[walletId] = { ...(all[walletId] || {}), lastCreatedIndex: index };
    saveMeta(all);
  }
}