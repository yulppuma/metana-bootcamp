// src/context/WalletContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { generateMnemonic, validateMnemonic, mnemonicToSeedSync } from "@scure/bip39";
import * as bip39 from '@scure/bip39';
import { wordlist as english } from '@scure/bip39/wordlists/english';
import { HDKey } from "@scure/bip32";
import * as secp from "@noble/secp256k1";
import { keccak_256 } from "@noble/hashes/sha3";
import { encryptSecretWithPassword, decryptSecretWithPassword, makePasswordVerifier, verifyPassword } from "./utils/ec-keystore.js";

const STORE_KEY = "wallet_store_v1";
const PATH_PREFIX = `m/44'/60'/0'/0/`;

const WalletContext = createContext(null);

// utils
const to0x = (u8) => "0x" + toHex(u8);
function addressFromPublicKey(uncompressedPubkey) {
  // uncompressed pubkey = 0x04 || X || Y; address = last 20 bytes of keccak256(X || Y)
  const noPrefix = uncompressedPubkey.slice(1);
  const addrBytes = keccak256(noPrefix).slice(-20);
  return to0x(addrBytes);
}

function loadStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{"activeId":null,"wallets":{}}'); }
  catch { return { activeId: null, wallets: {} }; }
}
function saveStore(s) { localStorage.setItem(STORE_KEY, JSON.stringify(s)); }

export function WalletProvider({ children }) {
  const [store, setStore] = useState(loadStore());
  const [activeId, setActiveId] = useState(loadStore().activeId);
  const activeWallet = useMemo(() => activeId ? store.wallets[activeId] ?? null : null, [store, activeId]);

  useEffect(() => saveStore({ activeId, wallets: store.wallets }), [store, activeId]);

  // ---- API: Create wallet (password required). Nothing gets deleted; multiple wallets kept. ----
  const createWallet = async ({ name = "Wallet", password, strength = 128 }) => {
    if (!password || password.length < 6) throw new Error("Password too short");

    // 1) Generate mnemonic (12 or 24 words)
    const mnemonic = bip39.generateMnemonic(english, strength);
    if (!bip39.validateMnemonic(mnemonic, english)) throw new Error("Mnemonic invalid");

    // 2) Derive root & first account
    const seed = bip39.mnemonicToSeedSync(mnemonic); // Uint8Array
    const root = HDKey.fromMasterSeed(seed);
    const child0 = root.derive(PATH_PREFIX + "0");
    const priv = child0.privateKey;                       // Uint8Array(32)
    if (!priv) throw new Error("No private key");
    const pub = secp256k1.getPublicKey(priv, false);      // 65 bytes, 0x04 + X + Y
    const address = addressFromPublicKey(pub);

    // 3) Encrypt sensitive data with password
    const encSeed = await encryptSecretWithPassword(mnemonic, password);
    const pwVerifier = await makePasswordVerifier(password);

    // 4) Persist as a new wallet (does NOT delete previous)
    const id = crypto.randomUUID();
    const wallet = {
      id,
      name,
      createdAt: Date.now(),
      passwordVerifier: pwVerifier,    // for login checks
      encSeed,                         // encrypted mnemonic (seed)
      accounts: [
        {
          index: 0,
          address,
          publicKey: to0x(pub),
          // (we do NOT store privateKey; re-derive from mnemonic when needed)
          balances: {},                 // <- per-account balances live here
          txHistory: [],                // <- per-account history here
        },
      ],
      meta: {}, // room for network RPC, notes, etc.
    };

    const next = { ...store, wallets: { ...store.wallets, [id]: wallet } };
    if (!store.activeId) next.activeId = id;
    setStore(next);
    if (!store.activeId) setActiveId(id);
    return wallet;
  };

  // ---- Switching & basics (no deletion on create) ----
  const setActiveWallet = (walletId) => {
    if (!store.wallets[walletId]) throw new Error("Wallet not found");
    setActiveId(walletId);
    setStore((s) => ({ ...s, activeId: walletId }));
  };

  // (Optional) check password for current wallet without decrypting seed
  const checkPassword = async (walletId, password) => {
    const w = store.wallets[walletId];
    if (!w) throw new Error("Wallet not found");
    return verifyPassword(password, w.passwordVerifier);
  };

  // (Later) when you need to sign, call this to get mnemonic:
  const unlockSeed = async (walletId, password) => {
    const w = store.wallets[walletId];
    if (!w) throw new Error("Wallet not found");
    return await decryptSecretWithPassword(w.encSeed, password);
  };

  const value = {
    // state
    wallets: store.wallets,
    activeId,
    activeWallet,

    // actions
    createWallet,        // ({ name?, password, strength? })
    setActiveWallet,     // (walletId)
    checkPassword,       // (walletId, password) -> boolean
    unlockSeed,          // (walletId, password) -> mnemonic
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
