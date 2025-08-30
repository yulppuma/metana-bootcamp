// src/context/WalletContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

// --- use ethereum-cryptography for everything ---
import * as bip39 from "ethereum-cryptography/bip39/index.js";
import { wordlist as english } from "ethereum-cryptography/bip39/wordlists/english.js";
import { HDKey } from "ethereum-cryptography/hdkey.js";
import { secp256k1 } from "ethereum-cryptography/secp256k1.js";
import { keccak256 } from "ethereum-cryptography/keccak.js";
import { utf8ToBytes, hexToBytes, bytesToHex as toHex } from "ethereum-cryptography/utils.js";

// keystore (your file from earlier; adjust path if you put it elsewhere)
import { encryptSecretWithPassword, decryptSecretWithPassword, makePasswordVerifier, verifyPassword as verifyPw,} from "./utils/ec-keystore.js"; // <-- NOTE: path

const STORE_KEY = "wallet_store_v1";
const PATH_PREFIX = `m/44'/60'/0'/0/`;
//Used to identify the primary wallet (Seed)
const PRIMARY_REF = "primary";

const WalletContext = createContext(null);

// utils
const to0x = (u8) => "0x" + toHex(u8);
const strip0x = (h) => (h?.startsWith("0x") ? h.slice(2) : h);
const isHex = (h) => /^[0-9a-fA-F]+$/.test(h);

function hdIdFromMnemonic(m) {
  const norm = m.trim().toLowerCase().replace(/\s+/g, " ");
  const h = keccak256(utf8ToBytes(norm));
  return "hd:" + toHex(h).slice(0, 32);
}
function pkIdFromPrivateKey(pkHex) {
  const h = keccak256(hexToBytes("0x" + strip0x(pkHex)));
  return "pk:" + toHex(h).slice(0, 32);
}

function ensureKeySourcesArray(w) {
  if (!w.keySources) w.keySources = [];
  return w.keySources;
}

function addressFromPublicKey(uncompressedPub) {
  // uncompressed pubkey: 0x04 || X || Y; address = last 20 bytes of keccak256(X || Y)
  const noPrefix = uncompressedPub.slice(1);
  const addrBytes = keccak256(noPrefix).slice(-20);
  return to0x(addrBytes);
}

function loadStore() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '{"activeId":null,"wallets":{}}');
  } catch {
    return { activeId: null, wallets: {} };
  }
}
function saveStore(s) {
  localStorage.setItem(STORE_KEY, JSON.stringify(s));
}

export function WalletProvider({ children }) {
  const [store, setStore] = useState(loadStore());
  const [activeId, setActiveId] = useState(loadStore().activeId);
  const [ephemeralWallet, setEphemeralWallet] = useState(null);
  const activeWallet = useMemo(
    () => (activeId ? store.wallets[activeId] ?? null : null),
    [store, activeId]
  );

  const effectiveWallet = useMemo(
    () => ephemeralWallet ?? (activeId ? store.wallets[activeId] ?? null : null),
    [ephemeralWallet, store, activeId]
  );

  const selectedAccount = useMemo(() => {
    const w = effectiveWallet;
    if (!w) return null;
    const i = w.activeAccountIndex ?? 0;
    return w.accounts?.[i] ?? null;
  }, [effectiveWallet]);

  

  useEffect(() => saveStore({ activeId, wallets: store.wallets }), [store, activeId]);

  // ---- Create wallet (password required). Keeps previous wallets. ----
  const createWallet = async ({ name = "Wallet", password, strength = 128 }) => {
    if (!password || password.length < 6) throw new Error("Password too short");

    // 1) Generate mnemonic (12 words for 128, 24 words for 256)
    const mnemonic = bip39.generateMnemonic(english, strength);
    if (!bip39.validateMnemonic(mnemonic, english)) throw new Error("Mnemonic invalid");

    // 2) Derive root & first account
    const seed = bip39.mnemonicToSeedSync(mnemonic); // Uint8Array
    const root = HDKey.fromMasterSeed(seed);
    const child0 = root.derive(PATH_PREFIX + "0");
    const priv = child0.privateKey; // Uint8Array(32)
    if (!priv) throw new Error("No private key at path");
    const pub = secp256k1.getPublicKey(priv, false); // 65 bytes (0x04 + X + Y)
    const address = addressFromPublicKey(pub);

    // 3) Encrypt sensitive data with password
    const encSeed = await encryptSecretWithPassword(mnemonic, password);
    const pwVerifier = await makePasswordVerifier(password);

    // 4) Persist as a new wallet (does NOT delete previous)
    const id = crypto.randomUUID();
    const wallet = {
      id,
      kind: "hd",
      name,
      createdAt: Date.now(),
      passwordVerifier: pwVerifier, // for quick checks
      encSeed,                      // encrypted mnemonic (seed)
      activeAccountIndex: 0,
      accounts: [
        {
          index: 0,
          address,
          publicKey: to0x(pub),
          // privateKey NOT stored; re-derive from mnemonic when needed
          source: { type: "hd", ref: PRIMARY_REF, index: 0 },
          balances: {},   // per-account balances
          txHistory: [],  // per-account tx history
        },
      ],
      meta: {}, // room for RPC url, notes, etc.
    };

    const next = { ...store, wallets: { ...store.wallets, [id]: wallet } };
    if (!store.activeId) next.activeId = id;
    setStore(next);
    if (!store.activeId) setActiveId(id);
    return wallet;
  };

  const deriveNextAccount = async ({ walletId, password }) => {
    const w = store.wallets[walletId];
    if (!w) throw new Error("Wallet not found");

    // 1) unlock mnemonic with the user's password
    const mnemonic = await decryptSecretWithPassword(w.encSeed, password);

    // 2) derive next index from the HD root
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const root = HDKey.fromMasterSeed(seed);
    const nextIndex = w.accounts.length;
    const child = root.derive(PATH_PREFIX + String(nextIndex));

    const priv = child.privateKey;
    if (!priv) throw new Error("No private key at path");
    const pub = secp256k1.getPublicKey(priv, false); // 65 bytes (0x04 + X + Y)

    // 3) compute address from uncompressed pubkey
    const noPrefix = pub.slice(1);
    const addrBytes = keccak256(noPrefix).slice(-20);
    const address = "0x" + toHex(addrBytes);

    const newAccount = {
      index: nextIndex,
      address,
      publicKey: "0x" + toHex(pub),
      balances: {},
      txHistory: [],
    };

    // 4) persist
    const updated = {
      ...w,
      accounts: [...w.accounts, newAccount],
    };
    setStore(s => ({ ...s, wallets: { ...s.wallets, [walletId]: updated } }));

    return newAccount;
  };

  const setActiveAccount = ({ walletId, index }) => {
    const w = store.wallets[walletId];
    if (!w) throw new Error("Wallet not found");
    if (!Number.isInteger(index) || index < 0 || index >= w.accounts.length) {
      throw new Error("Invalid account index");
    }
    const updated = { ...w, activeAccountIndex: index };
    setStore(s => ({ ...s, wallets: { ...s.wallets, [walletId]: updated } }));
  };

  function buildHdWalletFromMnemonic(m, name = "Session HD Wallet") {
    const seed = bip39.mnemonicToSeedSync(m);
    const root = HDKey.fromMasterSeed(seed);
    const child0 = root.derive(PATH_PREFIX + "0");
    if (!child0.privateKey) throw new Error("No private key at path");
    const pub = secp256k1.getPublicKey(child0.privateKey, false);
    const address = addressFromPublicKey(pub);

    return {
      id: hdIdFromMnemonic(m),
      kind: "hd",
      name,
      // no createdAt, no encSeed — ephemeral only
      activeAccountIndex: 0,
      accounts: [
        { index: 0, address, publicKey: "0x" + toHex(pub), balances: {}, txHistory: [] },
      ],
      meta: {},
      // keep the plaintext ONLY in memory for the session:
      __ephemeral: { mnemonic: m }, // private field; never persist this
    };
  }

  function buildPkWalletFromPrivateKey(pkHex, name = "Session PK Wallet") {
    const pkBytes = hexToBytes("0x" + strip0x(pkHex));
    const pub = secp256k1.getPublicKey(pkBytes, false);
    const address = addressFromPublicKey(pub);

    return {
      id: pkIdFromPrivateKey(pkHex),
      kind: "pk",
      name,
      activeAccountIndex: 0,
      accounts: [
        { index: 0, address, publicKey: "0x" + toHex(pub), balances: {}, txHistory: [] },
      ],
      meta: {},
      __ephemeral: { privateKey: "0x" + strip0x(pkHex) }, // in-memory only
    };
  }

  const appendMnemonicAllToActive = async ({
    password,
    mnemonic,
    label = "Imported HD",
    gapLimit = 5,
    maxScan = 100,     // safety cap
    fallbackCount = 5, // if no RPC configured
  }) => {
    if (!activeId) throw new Error("Create/select a wallet first");
    if (!password || password.length < 6) throw new Error("Password too short");
    const m = mnemonic.trim().toLowerCase().replace(/\s+/g, " ");
    if (!bip39.validateMnemonic(m, english)) throw new Error("Invalid seed phrase");

    const target = store.wallets[activeId];
    if (!target) throw new Error("Active wallet not found");

    // Get RPC from env or wallet meta (don’t store API keys in localStorage)
    const rpcUrl =
      target.meta?.rpcUrl ||
      import.meta?.env?.VITE_RPC_SEPOLIA || // e.g. set this in .env
      null;

    const keySources = ensureKeySourcesArray(target);
    const now = Date.now();

    // 1) Save imported seed (encrypted with ACTIVE wallet password) in keySources
    const ref = "hd:" + hdIdFromMnemonic(m).slice(3);
    if (!keySources.find(k => k.id === ref)) {
      const encSeed = await encryptSecretWithPassword(m, password);
      keySources.push({ id: ref, type: "hd", label, encSeed, addedAt: now });
    }

    // 2) Derive & decide which to append
    const seed = bip39.mnemonicToSeedSync(m);
    const root = HDKey.fromMasterSeed(seed);
    const exists = (addr) => target.accounts.some(a => a.address.toLowerCase() === addr.toLowerCase());

    const toAppend = [];
    if (!rpcUrl) {
      // No RPC: append first N so user sees something
      for (let i = 0; i < fallbackCount && i < maxScan; i++) {
        const child = root.derive(PATH_PREFIX + String(i));
        if (!child.privateKey) continue;
        const pub = secp256k1.getPublicKey(child.privateKey, false);
        const addr = addressFromPublicKey(pub);
        if (exists(addr)) continue;
        toAppend.push({
          index: i,
          address: addr,
          publicKey: to0x(pub),
          source: { type: "hd", ref, index: i },
          origin: "imported",
          importedAt: now,
          balances: {},
          txHistory: [],
        });
      }
    } else {
      // RPC available: gap-limit discovery
      let i = 0, gap = 0;
      while (i < maxScan && gap < gapLimit) {
        const child = root.derive(PATH_PREFIX + String(i));
        if (!child.privateKey) { i++; gap++; continue; }
        const pub = secp256k1.getPublicKey(child.privateKey, false);
        const addr = addressFromPublicKey(pub);

        if (exists(addr)) { i++; gap = 0; continue; }

        let active = false;
        try { active = await hasActivity(rpcUrl, addr); } catch {}
        if (active) {
          toAppend.push({
            index: i,
            address: addr,
            publicKey: to0x(pub),
            source: { type: "hd", ref, index: i },
            origin: "imported",
            importedAt: now,
            balances: {},
            txHistory: [],
          });
          gap = 0;
        } else {
          gap += 1;
        }
        i++;
      }
    }

    if (!toAppend.length) return { appended: 0 };
    const updated = { ...target, keySources, accounts: [...target.accounts, ...toAppend] };
    setStore(s => ({ ...s, wallets: { ...s.wallets, [activeId]: updated } }));
    return { appended: toAppend.length };
  };

  const appendPrivateKeyToActive = async ({ password, privateKey, label = "Imported PK" }) => {
    if (!activeId) throw new Error("Create/select a wallet first");
    if (!password || password.length < 6) throw new Error("Password too short");
    let pkHex = strip0x((privateKey || "").trim());
    if (!isHex(pkHex) || pkHex.length !== 64) throw new Error("Private key must be 32-byte hex");

    const target = store.wallets[activeId];
    if (!target) throw new Error("Active wallet not found");

    const now = Date.now();
    const keySources = ensureKeySourcesArray(target);
    const ref = "pk:" + pkIdFromPrivateKey(pkHex).slice(3);

    if (!keySources.find(k => k.id === ref)) {
      const encPrivKey = await encryptSecretWithPassword("0x" + pkHex, password);
      keySources.push({ id: ref, type: "pk", label, encPrivKey, addedAt: now });
    }

    const pkBytes = hexToBytes("0x" + pkHex);
    const pub = secp256k1.getPublicKey(pkBytes, false);
    const addr = addressFromPublicKey(pub);
    const exists = target.accounts.some(a => a.address.toLowerCase() === addr.toLowerCase());
    if (exists) return { appended: 0 };

    const appendedAccount = {
      index: 0,
      address: addr,
      publicKey: to0x(pub),
      source: { type: "pk", ref },
      origin: "imported",
      importedAt: now,
      balances: {},
      txHistory: [],
    };

    const updated = { ...target, keySources, accounts: [...target.accounts, appendedAccount] };
    setStore(s => ({ ...s, wallets: { ...s.wallets, [activeId]: updated } }));
    return { appended: 1 };
  };

  const appendSessionIntoActive = async ({ password, label = "Imported" }) => {
    if (!ephemeralWallet) throw new Error("No session wallet to append from");
    if (!activeId) throw new Error("Select a stored wallet to append into");
    if (!password || password.length < 6) throw new Error("Password too short");

    const target = store.wallets[activeId];
    if (!target) throw new Error("Active stored wallet not found");

    const keySources = ensureKeySourcesArray(target);
    const now = Date.now();

    // 1) Persist the session secret into the target wallet (encrypted with target password)
    let srcRef; let srcDescriptor;

    if ((ephemeralWallet.kind ?? "hd") === "hd") {
      const m = ephemeralWallet.__ephemeral?.mnemonic;
      if (!m) throw new Error("Session HD has no mnemonic in memory");
      const encSeed = await encryptSecretWithPassword(m, password);
      srcRef = "hd:" + hdIdFromMnemonic(m).slice(3);

      if (!keySources.find(ks => ks.id === srcRef)) {
        keySources.push({ id: srcRef, type: "hd", label, encSeed, addedAt: now });
      }
      srcDescriptor = { type: "hd", ref: srcRef };
    } else if (ephemeralWallet.kind === "pk") {
      const pk = ephemeralWallet.__ephemeral?.privateKey;
      if (!pk) throw new Error("Session PK has no private key in memory");
      const encPrivKey = await encryptSecretWithPassword(pk, password);
      srcRef = "pk:" + pkIdFromPrivateKey(pk).slice(3);

      if (!keySources.find(ks => ks.id === srcRef)) {
        keySources.push({ id: srcRef, type: "pk", label, encPrivKey, addedAt: now });
      }
      srcDescriptor = { type: "pk", ref: srcRef };
    } else {
      throw new Error("Unknown session wallet kind");
    }

    // 2) Append accounts (addresses only). History starts fresh here.
    const exists = (addr) => target.accounts.some(a => a.address.toLowerCase() === addr.toLowerCase());
    const appended = [];
    for (const a of (ephemeralWallet.accounts || [])) {
      if (exists(a.address)) continue;
      appended.push({
        index: a.index,
        address: a.address,
        publicKey: a.publicKey,
        source: (srcDescriptor.type === "hd") ? { ...srcDescriptor, index: a.index } : srcDescriptor,
        origin: "imported",
        importedAt: now,
        balances: {},
        txHistory: [],
      });
    }

    if (appended.length === 0) return { appended: 0 };

    const updated = { ...target, keySources, accounts: [...target.accounts, ...appended] };
    setStore(s => ({ ...s, wallets: { ...s.wallets, [activeId]: updated } }));

    // We no longer need the session wallet once appended (optional).
    setEphemeralWallet(null);

    return { appended: appended.length };
  };

  // ---- Switch active wallet (don’t delete anything) ----
  const setActiveWallet = (walletId) => {
    if (!store.wallets[walletId]) throw new Error("Wallet not found");
    setActiveId(walletId);
    setStore((s) => ({ ...s, activeId: walletId }));
  };

  const importMnemonicSession = async ({ mnemonic, name = "Session HD Wallet" }) => {
    const m = mnemonic.trim().toLowerCase().replace(/\s+/g, " ");
    if (!bip39.validateMnemonic(m, english)) throw new Error("Invalid mnemonic");

    const id = hdIdFromMnemonic(m);
    const existing = store.wallets[id];
    if (existing) {
      setEphemeralWallet(null);
      setActiveWallet(id);
      return existing;
    }
    const ephem = buildHdWalletFromMnemonic(m, name);
    setEphemeralWallet(ephem);
    return ephem;
  };

  const recoverWalletSession = (opts) => importMnemonicSession(opts);

  const importPrivateKeySession = async ({ privateKey, name = "Session PK Wallet" }) => {
    let pkHex = strip0x(privateKey.trim());
    if (!isHex(pkHex) || pkHex.length !== 64) throw new Error("Private key must be 32 bytes hex");
    const id = pkIdFromPrivateKey(pkHex);
    const existing = store.wallets[id];
    if (existing) {
      setEphemeralWallet(null);
      setActiveWallet(id);
      return existing;
    }
    const ephem = buildPkWalletFromPrivateKey(pkHex, name);
    setEphemeralWallet(ephem);
    return ephem;
  };

  // ---- Quick password check without decrypting seed ----
  const checkPassword = async (walletId, password) => {
    const w = store.wallets[walletId];
    if (!w) throw new Error("Wallet not found");
    return verifyPw(password, w.passwordVerifier);
  };

  // ---- Decrypt the mnemonic (for signing/deriving later) ----
  const unlockSeed = async (walletId, password) => {
    const w = (ephemeralWallet && ephemeralWallet.id === walletId) ? ephemeralWallet : store.wallets[walletId];
    if (!w) throw new Error("Wallet not found");
    if (w.kind !== "hd") throw new Error("Not an HD wallet");
    if (w.__ephemeral?.mnemonic) return w.__ephemeral.mnemonic; // no decryption needed
    return await decryptSecretWithPassword(w.encSeed, password);
  };

  const unlockAccountPrivateKey = async ({ walletId, password, index }) => {
    const w = store.wallets[walletId];
    if (!w) throw new Error("Wallet not found");

    const account = w.accounts?.find(a => a.index === index && a.address);
    if (!account) throw new Error("Account not found");

    const src = account.source || { type: "hd", ref: PRIMARY_REF, index }; // default old entries

    // primary HD on this wallet?
    if (src.type === "hd" && (src.ref === PRIMARY_REF || (!src.ref && w.encSeed))) {
      const mnemonic = await decryptSecretWithPassword(w.encSeed, password);
      const seed = bip39.mnemonicToSeedSync(mnemonic);
      const root = HDKey.fromMasterSeed(seed);
      const child = root.derive(PATH_PREFIX + String(src.index ?? index));
      if (!child.privateKey) throw new Error("No private key at path");
      return "0x" + toHex(child.privateKey);
    }

    // imported HD key source?
    if (src.type === "hd" && w.keySources) {
      const ks = w.keySources.find(k => k.id === src.ref && k.type === "hd");
      if (!ks) throw new Error("Missing imported HD source");
      const mnemonic = await decryptSecretWithPassword(ks.encSeed, password);
      const seed = bip39.mnemonicToSeedSync(mnemonic);
      const root = HDKey.fromMasterSeed(seed);
      const child = root.derive(PATH_PREFIX + String(src.index ?? index));
      if (!child.privateKey) throw new Error("No private key at path");
      return "0x" + toHex(child.privateKey);
    }

    // imported PK key source?
    if (src.type === "pk" && w.keySources) {
      const ks = w.keySources.find(k => k.id === src.ref && k.type === "pk");
      if (!ks) throw new Error("Missing imported PK source");
      const hex = await decryptSecretWithPassword(ks.encPrivKey, password); // "0x..."
      return hex.toLowerCase();
    }

    throw new Error("Unable to unlock key for this account");
  };

  const value = {
    // state
    wallets: store.wallets,
    activeId,
    activeWallet: effectiveWallet,
    selectedAccount,
    ephemeralWallet,

    // actions
    createWallet,        // ({ name?, password, strength? })
    setActiveWallet,     // (walletId)
    setActiveAccount,
    checkPassword,       // (walletId, password) -> boolean
    unlockSeed,          // (walletId, password) -> mnemonic string
    unlockAccountPrivateKey,
    deriveNextAccount,   //(walletId, password)
    setActiveAccount,

    //import / recover / persist
    appendSessionIntoActive,
    importMnemonicSession,
    importPrivateKeySession,
    recoverWalletSession,
    appendMnemonicAllToActive,
    appendPrivateKeyToActive
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
