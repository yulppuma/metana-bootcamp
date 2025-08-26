// src/context/WalletContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { generateMnemonic, validateMnemonic, mnemonicToSeedSync } from "@scure/bip39";
import * as bip39 from '@scure/bip39';
import { wordlist as english } from '@scure/bip39/wordlists/english';
import { HDKey } from "@scure/bip32";
import * as secp from "@noble/secp256k1";
import { keccak_256 } from "@noble/hashes/sha3";

// ---------- tiny utils (no Buffer) ----------
const toHex = (u8) => "0x" + Array.from(u8).map(b => b.toString(16).padStart(2, "0")).join("");
const hexToBytes = (hex) => {
  let h = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (h.length % 2) h = "0" + h;
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
};
const keccak = (bytes) => keccak_256.create().update(bytes).digest();

// ---------- HD derivation (BIP44 ETH) ----------
const DERIVATION_PREFIX = `m/44'/60'/0'/0/`; // .../index

function rootFromMnemonic(mnemonic, passphrase = "") {
  if (!validateMnemonic(mnemonic, english)) {
    throw new Error("Invalid mnemonic");
  }
  const seed = mnemonicToSeedSync(mnemonic, passphrase); // Uint8Array
  return HDKey.fromMasterSeed(seed);
}

function deriveAccountAt(root, index = 0) {
  const child = root.derive(DERIVATION_PREFIX + index);
  if (!child.privateKey) throw new Error("No private key at path");
  const priv = child.privateKey;                                    // 32 bytes
  const pubUncompressed = secp.getPublicKey(priv, false);           // 65 bytes (0x04 + X + Y)
  const pubNoPrefix = pubUncompressed.slice(1);                     // 64 bytes
  const addressBytes = keccak(pubNoPrefix).slice(-20);              // last 20 bytes
  const address = toHex(addressBytes);
  const privateKey = toHex(priv);
  return { index, address, privateKey };
}

// ---------- Local storage ----------
const LS_KEY = "basic_wallet_v1";
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function saveToStorage(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}
function clearStorage() {
  localStorage.removeItem(LS_KEY);
}

// ---------- Context ----------
const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  // state kept minimal for now
  const [mnemonic, setMnemonic] = useState(""); // keep in memory; we can add encryption later
  const [accounts, setAccounts] = useState([]); // [{index, address, privateKey}]
  const [selectedIndex, setSelectedIndex] = useState(0);

  // boot: restore existing wallet (if any)
  useEffect(() => {
    const saved = loadFromStorage();
    if (saved?.mnemonic && Array.isArray(saved.accounts)) {
      setMnemonic(saved.mnemonic);
      setAccounts(saved.accounts);
      setSelectedIndex(saved.selectedIndex ?? 0);
    }
  }, []);

  // persist
  useEffect(() => {
    if (!mnemonic || accounts.length === 0) return;
    saveToStorage({ mnemonic, accounts, selectedIndex });
  }, [mnemonic, accounts, selectedIndex]);

  const selectedAccount = useMemo(
    () => accounts.find(a => a.index === selectedIndex) ?? null,
    [accounts, selectedIndex]
  );

  // ---------- actions ----------
  const createNewWallet = (strength = 128) => {
    const m = generateMnemonic(english, strength); // 12 words default
    const root = rootFromMnemonic(m);
    const acc0 = deriveAccountAt(root, 0);
    setMnemonic(m);
    setAccounts([acc0]);
    setSelectedIndex(0);
    // persisted by useEffect
    return { mnemonic: m, account: acc0 };
  };

  const importFromMnemonic = (inputMnemonic) => {
    const normalized = inputMnemonic.trim().toLowerCase();
    const root = rootFromMnemonic(normalized);
    const acc0 = deriveAccountAt(root, 0);
    setMnemonic(normalized);
    setAccounts([acc0]);
    setSelectedIndex(0);
    return { mnemonic: normalized, account: acc0 };
  };

  const deriveNextAccount = () => {
    if (!mnemonic) throw new Error("No wallet loaded");
    const root = rootFromMnemonic(mnemonic);
    const nextIndex = accounts.length; // simple incremental
    const acc = deriveAccountAt(root, nextIndex);
    setAccounts(prev => [...prev, acc]);
    return acc;
  };

  const removeWallet = () => {
    setMnemonic("");
    setAccounts([]);
    setSelectedIndex(0);
    clearStorage();
  };

  const value = {
    // state
    mnemonic,
    accounts,
    selectedIndex,
    selectedAccount,

    // actions
    createNewWallet,
    importFromMnemonic,
    deriveNextAccount,
    setSelectedIndex,
    removeWallet,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
