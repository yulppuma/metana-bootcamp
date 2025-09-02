// src/context/WalletContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

// --- use ethereum-cryptography for everything ---
import * as bip39 from "ethereum-cryptography/bip39/index.js";
import { wordlist as english } from "ethereum-cryptography/bip39/wordlists/english.js";
import { HDKey } from "ethereum-cryptography/hdkey.js";
import { secp256k1 } from "ethereum-cryptography/secp256k1.js";
import { keccak256 } from "ethereum-cryptography/keccak.js";
import { utf8ToBytes, hexToBytes, bytesToHex as toHex } from "ethereum-cryptography/utils.js";

// util functions for specific functionalities (updating imported account/wallet, encrypting/decrypting sensitive data, and any other non-generic functionality)
import { encryptSecretWithPassword, decryptSecretWithPassword, makePasswordVerifier, verifyPassword as verifyPw,} from "./utils/ec-keystore.js";
import { walletIdFromMnemonic, normalizeMnemonic } from "./utils/walletId.js";
import { setWalletMeta, bumpLastCreatedIndex, getWalletMeta } from "./utils/walletMeta.js";
import { makeRpc, CHAINS, getPendingNonce, suggest1559Fees, manualEstimateGas, erc20TransferCalldata, buildAndSignEip1559Tx, sendRawTransaction, erc20Name, erc20Symbol, erc20Decimals, erc20BalanceOf } from "./utils/tx-ec.js"

const STORE_KEY = "wallet_store_v1";
const PATH_PREFIX = `m/44'/60'/0'/0/`;
//Used to identify the primary wallet (Seed)
const PRIMARY_REF = "primary";

const WalletContext = createContext(null);

// utils
const to0x = (u8) => "0x" + toHex(u8);
const strip0x = (h) => (h?.startsWith("0x") ? h.slice(2) : h);
const isHex = (h) => /^[0-9a-fA-F]+$/.test(h);


function to0xHex(u8) { return "0x" + toHex(u8); }
function privFromChild(child) {
  if (!child.privateKey) throw new Error("No private key at path");
  return to0xHex(child.privateKey);
}
function pathFor(a) {
  return a.derivationPath ?? (PATH_PREFIX + String(a.index));
}
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

function normalizePk(pk) {
  let h = (pk || "").trim();
  if (h.startsWith("0x") || h.startsWith("0X")) h = h.slice(2);
  if (!/^[0-9a-fA-F]+$/.test(h) || h.length !== 64) return null;
  return h.toLowerCase();
}

function addressFromPublicKey(uncompressedPub) {
  // uncompressed pubkey: 0x04 || X || Y; address = last 20 bytes of keccak256(X || Y)
  const noPrefix = uncompressedPub.slice(1);
  const addrBytes = keccak256(noPrefix).slice(-20);
  return to0x(addrBytes);
}

function findWalletHoldingAddress(store, address) {
  const wallets = store.wallets || {};
  const addrL = address.toLowerCase();
  for (const w of Object.values(wallets)) {
    if ((w.accounts || []).some(a => a.address.toLowerCase() === addrL)) {
      return w;
    }
  }
  return null;
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

  const [locked, setLocked] = useState(true);
  useEffect(() => {
    const s = sessionStorage.getItem("WALLET_LOCKED");
    if (s != null) setLocked(JSON.parse(s));
  }, []);
  useEffect(() => {
    sessionStorage.setItem("WALLET_LOCKED", JSON.stringify(locked));
  }, [locked]);
  function lock() {
    setLocked(true);
  }
  useEffect(() => saveStore({ activeId, wallets: store.wallets }), [store, activeId]);

  async function unlockWithPassword(password, walletId = activeId) {
    const w = store.wallets[walletId];
    if (!w) throw new Error("Wallet not found");
    const ok = await verifyPw(password, w.passwordVerifier);
    if (!ok) throw new Error("Invalid password");
    setLocked(false);
  }

  // ---- Create wallet (password required). Keeps previous wallets. ----
  const createWallet = async ({ name = "Wallet", password, strength = 128 }) => {
    if (!password || password.length < 6) throw new Error("Password too short");

    // 1) Generate mnemonic (12 words for 128, 24 words for 256)
    const mnemonic = bip39.generateMnemonic(english, strength);
    if (!bip39.validateMnemonic(mnemonic, english)) throw new Error("Mnemonic invalid");
    const norm = normalizeMnemonic(mnemonic);
    const wid = walletIdFromMnemonic(norm);
    setWalletMeta(wid, { lastCreatedIndex: 0 });

    // 2) Derive root & first account
    const seed = bip39.mnemonicToSeedSync(mnemonic); // Uint8Array
    const root = HDKey.fromMasterSeed(seed);
    const PATH0 = PATH_PREFIX + "0"; 
    const child0 = root.derive(PATH0);
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
      passwordVerifier: pwVerifier, 
      encSeed,                      // encrypted mnemonic (seed)
      activeAccountIndex: 0,
      accounts: [
        {
          index: 0,
          address,
          publicKey: to0x(pub),
          derivationPath: PATH0,
          source: { type: "hd", ref: PRIMARY_REF, index: 0 },
          balances: {},   // per-account balances
          txHistory: [],  // per-account tx history
        },
      ],
      meta: {
        ...((store.wallets?.[id]?.meta) || {}),
        wid,
      },
    };

    /*const next = { ...store, wallets: { ...store.wallets, [id]: wallet } };
    if (!store.activeId) next.activeId = id;
    setStore(next);
    if (!store.activeId) setActiveId(id);*/
    const next = { ...store, wallets: { ...store.wallets, [id]: wallet }, activeId: id };
    setStore(next);
    setActiveId(id);
    setLocked(false); // brand new wallet -> considered logged in
    return wallet;
  };

  const deriveNextAccount = async ({ walletId, password }) => {
    const w = store.wallets[walletId];
    if (!w) throw new Error("Wallet not found");

    // 1) unlock mnemonic with the user's password
    const mnemonic = await decryptSecretWithPassword(w.encSeed, password);

    const wid = walletIdFromMnemonic(normalizeMnemonic(mnemonic));

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
    derivationPath: `${PATH_PREFIX}${nextIndex}`,
    origin: { id: wid, label: w.name ?? "Local", index: nextIndex },
  };

    // 4) persist
    const updated = {
      ...w,
      accounts: [...w.accounts, newAccount],
    };
    setStore(s => ({ ...s, wallets: { ...s.wallets, [walletId]: updated } }));

    bumpLastCreatedIndex(wid, nextIndex);

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
      activeAccountIndex: 0,
      accounts: [
        { index: 0, address, publicKey: "0x" + toHex(pub), balances: {}, txHistory: [] },
      ],
      meta: {},
      __ephemeral: { mnemonic: m },
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

  const appendMnemonicAllToActive = async ({password, mnemonic, label = "Imported HD",}) => {
    if (!activeId) throw new Error("Create/select a wallet first");
    if (!password || password.length < 6) throw new Error("Password too short");

    // Normalize & validate the SRP
    const m = normalizeMnemonic(mnemonic);
    if (!bip39.validateMnemonic(m, english)) throw new Error("Invalid seed phrase");

    const target = store.wallets[activeId];
    if (!target) throw new Error("Active wallet not found");

    // --- LOCAL-ONLY LOOKUP: find the source wallet by wallet-id ---
    const wid = walletIdFromMnemonic(m);
    const src = Object.values(store.wallets || {}).find(w => w?.meta?.wid === wid) || null;
    if (!src) {
      throw new Error("Wallet not found in this browser (no local data)");
    }
    const meta = getWalletMeta(wid);
    const lastCreatedIndex =
      typeof meta?.lastCreatedIndex === "number"
        ? meta.lastCreatedIndex
        : (src.accounts?.length || 0) - 1;

    if (lastCreatedIndex < 0) return { appended: 0 };
    const keySources = ensureKeySourcesArray(target);
    const now = Date.now();
    const ref = `hd:${wid}`;
    if (!keySources.find(k => k.id === ref)) {
      const encSeed = await encryptSecretWithPassword(m, password);
      keySources.push({ id: ref, type: "hd", label, encSeed, addedAt: now });
    }

    // Derive addresses deterministically for 0..lastCreatedIndex on standard path
    const seed = bip39.mnemonicToSeedSync(m);
    const root = HDKey.fromMasterSeed(seed);

    const exists = (addr) =>
      (target.accounts || []).some(a => a.address.toLowerCase() === addr.toLowerCase());

    const toAppend = [];
    for (let i = 0; i <= lastCreatedIndex; i++) {
      const path = PATH_PREFIX + String(i);
      const child = root.derive(path);
      if (!child.privateKey) continue;

      const pub = secp256k1.getPublicKey(child.privateKey, false);
      const addr = addressFromPublicKey(pub);

      if (exists(addr)) continue; // dedupe into ACTIVE wallet

      toAppend.push({
        index: i,
        address: addr,
        publicKey: to0x(pub),
        derivationPath: path,
        source: { type: "hd", ref, index: i },                 
        origin: { id: wid, label: src.name || label, index: i },
        importedAt: now,
        balances: {},
        txHistory: [],
      });
    }

    if (!toAppend.length) return { appended: 0 };

    const updated = {
      ...target,
      keySources,
      accounts: [...(target.accounts || []), ...toAppend],
    };

    setStore(s => ({ ...s, wallets: { ...s.wallets, [activeId]: updated } }));
    return { appended: toAppend.length };
  };

  const appendPrivateKeyToActive = async ({ password, privateKey, label = "Imported PK" }) => {
    if (!activeId) throw new Error("No active wallet selected");
    if (!password || password.length < 6) throw new Error("Password too short");

    const target = store.wallets[activeId];
    if (!target) throw new Error("Active wallet not found");

    const norm = normalizePk(privateKey);
    if (!norm) throw new Error("Private key must be 32-byte hex");

    // derive pubkey + address
    const privBytes = hexToBytes(norm);
    if (!secp256k1.utils.isValidPrivateKey(privBytes)) {
      throw new Error("Invalid private key");
    }
    const pub = secp256k1.getPublicKey(privBytes, false); // uncompressed (65 bytes)
    const address = addressFromPublicKey(pub);

    // dedup in ACTIVE wallet
    const existsHere = (target.accounts || []).some(
      a => a.address.toLowerCase() === address.toLowerCase()
    );
    if (existsHere) return { appended: 0, address };

    // encrypt pk with ACTIVE wallet's password
    const encPrivateKey = await encryptSecretWithPassword("0x" + norm, password);
    let uiIndex = (target.accounts?.length ?? 0);
    let origin = { id: `pk:${address.toLowerCase()}`, label, index: 0 };
    let derivationPath = undefined;

    const other = findWalletHoldingAddress(store, address);
    if (other) {
      const found = (other.accounts || []).find(a => a.address.toLowerCase() === address.toLowerCase());
      if (found?.origin) {
        origin = { ...found.origin };
      } else {
        origin = { id: other.meta?.wid || origin.id, label: other.name || label, index: found?.index ?? 0 };
      }
      derivationPath = found?.derivationPath;
    }

    const newAccount = {
      index: uiIndex,
      address,
      publicKey: to0x(pub),
      derivationPath,
      source: { type: "pk" },
      origin,
      encPrivateKey,                 
      balances: {},
      txHistory: [],
    };

    const updated = {
      ...target,
      accounts: [...(target.accounts || []), newAccount],
    };

    setStore(s => ({ ...s, wallets: { ...s.wallets, [activeId]: updated } }));

    return { appended: 1, address };
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
    setEphemeralWallet(null);

    return { appended: appended.length };
  };

  // ---- Switch active wallet ----
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
    const a = w.accounts?.[index];
    if (!a) throw new Error("Account not found");

    // PK-imported account: decrypt the stored encPrivateKey
    if (a.source?.type === "pk") {
      if (!a.encPrivateKey) throw new Error("No encrypted PK stored");
      const pk = await decryptSecretWithPassword(a.encPrivateKey, password);
      if (!/^0x[0-9a-fA-F]{64}$/.test(pk)) throw new Error("Decrypted PK malformed");
      return pk;
    }

    // HD-derived account: decrypt mnemonic, derive along path
    if (a.source?.type === "hd" || a.source?.type == null) {
      if (!w.encSeed) throw new Error("No encrypted seed for this wallet");
      const mnemonic = await decryptSecretWithPassword(w.encSeed, password);
      const seed = bip39.mnemonicToSeedSync(mnemonic);
      const root = HDKey.fromMasterSeed(seed);
      const child = root.derive(pathFor(a));
      return privFromChild(child); // "0x..." 64 hex
    }

    throw new Error("Unsupported account source");
  };

  async function sendEthFromAccount({ chain = "sepolia", walletId, password, index, to, valueWei}) {
    if (locked) throw new Error("Wallet is locked");
    const w = store.wallets[walletId];
    if (!w) throw new Error("Wallet not found");
    const a = w.accounts?.[index];
    if (!a) throw new Error("Account not found");

    const privKey = await unlockAccountPrivateKey({ walletId, password, index }); // "0x..64"
    const from = a.address;
    const rpcUrl = chain === "holesky" ? import.meta.env.VITE_HOLESKY_RPC : import.meta.env.VITE_SEPOLIA_RPC;
    const rpc = makeRpc(rpcUrl);

    const nonce = await getPendingNonce(rpc, from);
    const { maxPriorityFeePerGas, maxFeePerGas } = await suggest1559Fees(rpc);

    const { raw, txHash } = buildAndSignEip1559Tx({
      chainId: CHAINS[chain].chainId,
      nonce,
      to,
      value: BigInt(valueWei),
      data: "0x",
      gasLimit: 21_000n,
      maxFeePerGas,
      maxPriorityFeePerGas,
      privKey,
    });

    const accepted = await sendRawTransaction(rpc, raw);
    const now = Date.now();
    const updatedAccs = w.accounts.map(acc => {
      if (acc.index !== index) return acc;
      const txEntry = {
        hash: accepted,
        to,
        value: valueWei?.toString?.() ?? String(valueWei ?? 0),
        type: "ETH" // or "ERC20" with token address & amount
        , chain, time: now
      };
      return { ...acc, txHistory: [txEntry, ...(acc.txHistory || [])] };
    });

    setStore(s => ({
      ...s,
      wallets: { ...s.wallets, [walletId]: { ...w, accounts: updatedAccs } }
    }));

    return { predictedHash: txHash, acceptedHash: accepted };
  }

  async function sendErc20FromAccount({ chain = "sepolia", walletId, password, index, token, to, amount}) {
    if (locked) throw new Error("Wallet is locked");
    const w = store.wallets[walletId];
    if (!w) throw new Error("Wallet not found");
    const a = w.accounts?.[index];
    if (!a) throw new Error("Account not found");

    const privKey = await unlockAccountPrivateKey({ walletId, password, index });
    const from = a.address;
    const rpcUrl = chain === "holesky" ? import.meta.env.VITE_HOLESKY_RPC : import.meta.env.VITE_SEPOLIA_RPC;
    const rpc = makeRpc(rpcUrl);

    const nonce = await getPendingNonce(rpc, from);
    const { maxPriorityFeePerGas, maxFeePerGas } = await suggest1559Fees(rpc);
    const data = erc20TransferCalldata(to, BigInt(amount));

    const gasLimit = await manualEstimateGas(rpc, { from, to: token, data });

    const { raw, txHash } = buildAndSignEip1559Tx({
      chainId: CHAINS[chain].chainId,
      nonce,
      to: token,
      value: 0n,
      data,
      gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
      privKey,
    });

    const accepted = await sendRawTransaction(rpc, raw);
    const now = Date.now();

    // append tx entry to the *slot* `index`
    const updatedAccs = w.accounts.map((acc, slot) => {
      if (slot !== index) return acc;
      const txEntry = {
        type: "ERC20",
        hash: accepted,
        chain,
        token,                   // contract address
        to,
        amount: amount.toString(), // base units
        time: now,
        nonce: nonce.toString(),
        gasLimit: gasLimit.toString(),
        maxFeePerGas: maxFeePerGas.toString(),
        maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
      };
      return { ...acc, txHistory: [txEntry, ...(acc.txHistory || [])] };
    });

    setStore(s => ({
      ...s,
      wallets: { ...s.wallets, [walletId]: { ...w, accounts: updatedAccs } }
    }));

    return {
      predictedHash: txHash,
      acceptedHash: accepted,
      gasLimit: gasLimit.toString(),
    };
  }

  async function getAccountPendingNonce({ rpcUrl, address }) {
    const rpc = makeRpc(rpcUrl);
    return await getPendingNonce(rpc, address);
  }

  async function importTokenToAccount({ walletId, index, chain = "sepolia", tokenAddress }) {
    const w = store.wallets[walletId];
    if (!w) throw new Error("Wallet not found");
    const a = w.accounts?.[index];
    if (!a) throw new Error("Account not found");
    if (!/^0x[0-9a-fA-F]{40}$/.test(tokenAddress)) throw new Error("Invalid token address");

    const rpcUrl = chain === "holesky" ? import.meta.env.VITE_HOLESKY_RPC : import.meta.env.VITE_SEPOLIA_RPC;
    if (!rpcUrl) throw new Error(`Missing RPC URL for ${chain}`);
    const rpc = makeRpc(rpcUrl);

    const [name, symbol, decimals] = await Promise.all([
      erc20Name(rpc, tokenAddress),
      erc20Symbol(rpc, tokenAddress),
      erc20Decimals(rpc, tokenAddress),
    ]);

    const token = {
      chain,
      address: tokenAddress.toLowerCase(),
      name: name || "Unknown",
      symbol: symbol || "TKN",
      decimals: Number.isFinite(decimals) ? decimals : 18,
    };

    const updated = { ...w };
    const acct = { ...updated.accounts[index] };
    const tokens = Array.isArray(acct.tokens) ? [...acct.tokens] : [];
    if (!tokens.some(t => t.chain === chain && t.address === token.address)) tokens.push(token);
    acct.tokens = tokens;
    updated.accounts[index] = acct;

    setStore(s => ({ ...s, wallets: { ...s.wallets, [walletId]: updated } }));

    // immediately fetch its current balance and store it
    await refreshOneTokenBalance({ walletId, index, chain, tokenAddress: token.address });
    return token;
  }

  async function refreshOneTokenBalance({ walletId, index, chain = "sepolia", tokenAddress }) {
    const w = store.wallets[walletId];
    if (!w) throw new Error("Wallet not found");
    const a = w.accounts?.[index];
    if (!a) throw new Error("Account not found");

    const rpcUrl = chain === "holesky" ? import.meta.env.VITE_HOLESKY_RPC : import.meta.env.VITE_SEPOLIA_RPC;
    if (!rpcUrl) throw new Error(`Missing RPC URL for ${chain}`);
    const rpc = makeRpc(rpcUrl);

    const raw = await erc20BalanceOf(rpc, tokenAddress, a.address);
    const key = `${chain}:${tokenAddress.toLowerCase()}`;

    const updated = { ...w };
    const acct = { ...updated.accounts[index] };
    acct.balances = { ...(acct.balances || {}), [key]: raw.toString() };
    updated.accounts[index] = acct;

    setStore(s => ({ ...s, wallets: { ...s.wallets, [walletId]: updated } }));
    return raw;
  }

  async function refreshTokenBalances({ walletId, index, chain = "sepolia" }) {
    const w = store.wallets[walletId];
    if (!w) throw new Error("Wallet not found");
    const a = w.accounts?.[index];
    if (!a) throw new Error("Account not found");
    const tokens = (a.tokens || []).filter(t => t.chain === chain);
    for (const t of tokens) {
      await refreshOneTokenBalance({ walletId, index, chain, tokenAddress: t.address });
    }
    return tokens.length;
  }

    async function recoverWithSeed({ seed, newPassword, walletId = activeId }) {
      const w = store.wallets[walletId];
      if (!w) throw new Error("Wallet not found");
      if (w.kind !== "hd") throw new Error("Only HD wallets can be recovered");
      const m = normalizeMnemonic(seed);
      if (!bip39.validateMnemonic(m, english)) throw new Error("Invalid seed phrase");
      const wid = walletIdFromMnemonic(m);
      if (w.meta?.wid !== wid) throw new Error("Seed phrase does not match this wallet");
      const encSeed = await encryptSecretWithPassword(m, newPassword);
      const pwVerifier = await makePasswordVerifier(newPassword);
      const updated = { ...w, encSeed, passwordVerifier: pwVerifier };
      setStore(s => ({ ...s, wallets: { ...s.wallets, [walletId]: updated } }));
      setLocked(false);
      return true;
    }

    async function importWalletFromSeed({ seed, password }) {
      const m = normalizeMnemonic(seed);
      if (!bip39.validateMnemonic(m, english)) throw new Error("Invalid seed phrase");
      const wid = walletIdFromMnemonic(m);
      const foundId = Object.keys(store.wallets).find(id => store.wallets[id]?.meta?.wid === wid);
      if (!foundId) throw new Error("Incorrect seed phrase (wallet not found in this browser)");
      setActiveWallet(foundId);
      setLocked(false);
      return store.wallets[foundId];
    }


  const value = {
    // state
    wallets: store.wallets,
    activeId,
    activeWallet: effectiveWallet,
    selectedAccount,
    ephemeralWallet,
    locked,

    // actions
    createWallet,        // ({ name?, password, strength? })
    setActiveWallet,     // (walletId)
    setActiveAccount,
    checkPassword,       // (walletId, password) -> boolean
    unlockSeed,          // (walletId, password) -> mnemonic string
    unlockAccountPrivateKey,
    deriveNextAccount,   //(walletId, password)
    lock,
    unlockWithPassword,
    recoverWithSeed,
    importWalletFromSeed,

    //import / recover / persist
    appendSessionIntoActive,
    importMnemonicSession,
    importPrivateKeySession,
    recoverWalletSession,
    appendMnemonicAllToActive,
    appendPrivateKeyToActive,

    // tx logic
    sendEthFromAccount,
    sendErc20FromAccount,
    getAccountPendingNonce,

    //erc20 logic
    importTokenToAccount,
    refreshTokenBalances,
    refreshOneTokenBalance
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
