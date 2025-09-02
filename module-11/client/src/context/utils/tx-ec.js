import { keccak256 } from "ethereum-cryptography/keccak.js";
import { secp256k1 } from "ethereum-cryptography/secp256k1.js";
import { hexToBytes, bytesToHex } from "ethereum-cryptography/utils.js";

//again some helper functions to keep sanity
const strip0x = (h) => (h && h.startsWith("0x") ? h.slice(2) : h || "");
const add0x = (h) => (h && h.startsWith("0x") ? h : "0x" + (h || ""));
const toBig = (v) => (typeof v === "bigint" ? v : BigInt(v));
const bigToBytes = (n) => {
  if (n === 0n) return new Uint8Array([]);
  let hex = n.toString(16);
  if (hex.length % 2) hex = "0" + hex;
  return hexToBytes(hex);
};
const u8 = (hex) => hexToBytes(strip0x(hex));
const u8ToHex0x = (b) => add0x(bytesToHex(b));
const bigToHex0x = (n) => {
  let h = toBig(n).toString(16);
  if (h.length % 2) h = "0" + h;
  return "0x" + (h || "00");
};


// RLP
const rlpEncodeBytes = (b) => {
  const len = b.length;
  if (len === 1 && b[0] < 0x80) return b;
  if (len <= 55) return new Uint8Array([0x80 + len, ...b]);
  const L = bigToBytes(BigInt(len));
  return new Uint8Array([0xb7 + L.length, ...L, ...b]);
};
const rlpEncodeList = (items) => {
  const payloadLen = items.reduce((a, x) => a + x.length, 0);
  if (payloadLen <= 55) return new Uint8Array([0xc0 + payloadLen, ...items.flatMap((x) => [...x])]);
  const L = bigToBytes(BigInt(payloadLen));
  return new Uint8Array([0xf7 + L.length, ...L, ...items.flatMap((x) => [...x])]);
};

// encoders
const rlpInt = (n) => rlpEncodeBytes(bigToBytes(toBig(n)));
const rlpBytes = (hex) => rlpEncodeBytes(u8(hex));
const rlpAddr = (hex20) => (hex20 ? rlpEncodeBytes(u8(hex20)) : rlpEncodeBytes(new Uint8Array([])));
const rlpAccessList = (list = []) => {
  const enc = list.map(({ address, storageKeys }) =>
    rlpEncodeList([
      rlpAddr(address),
      rlpEncodeList((storageKeys || []).map(rlpBytes)),
    ])
  );
  return rlpEncodeList(enc);
};

export function getRpcFor(chain) {
  const url = chain === "holesky"
    ? import.meta.env.VITE_HOLESKY_RPC
    : import.meta.env.VITE_SEPOLIA_RPC;
  if (!url) throw new Error(`Missing RPC URL for ${chain}. Did you set it in .env and restart dev server?`);
  return makeRpc(url);
}

export function resolveRpcFromEnv(chain /* "sepolia" | "holesky" */) {
  const isVite = typeof import.meta !== "undefined" && import.meta && import.meta.env;
  const viteSep = isVite ? import.meta.env.VITE_SEPOLIA_RPC : undefined;
  const viteHol = isVite ? import.meta.env.VITE_HOLESKY_RPC : undefined;

  // process.env is replaced at build time when bundlers inject it
  const pe = typeof process !== "undefined" ? process.env : undefined;

  const url =
    chain === "holesky"
      ? (viteHol || pe?.VITE_HOLESKY_RPC || pe?.REACT_APP_HOLESKY_RPC || "")
      : (viteSep || pe?.VITE_SEPOLIA_RPC || pe?.REACT_APP_SEPOLIA_RPC || "");

  return url;
}

// ---- JSON-RPC client ----
export function makeRpc(rpcUrl) {
  if (!rpcUrl) {
    throw new Error("RPC URL is empty/undefined. Check set VITE_SEPOLIA_RPC or VITE_HOLESKY_RPC and restart the dev server?");
  }
  return async function rpc(method, params = []) {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });

    const text = await res.text(); // <-- read raw first
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      // Surface the real problem (HTML error page, CORS, 403, etc.)
      const preview = text?.slice(0, 200) || "<empty body>";
      throw new Error(
        `RPC response was not JSON (status ${res.status}). Check RPC URL/API key & CORS.\nMethod: ${method}\nBody preview: ${preview}`
      );
    }
    if (json.error) {
      throw new Error(`${method} error: ${json.error.message || JSON.stringify(json.error)}`);
    }
    return json.result;
  };
}

// ---- chain ids (you can import from env or keep here) ----
export const CHAINS = {
  sepolia: { chainId: 11155111n },
  holesky: { chainId: 17000n },
};

// ---- nonce ----
export async function getPendingNonce(rpc, address) {
  return BigInt(await rpc("eth_getTransactionCount", [address, "pending"]));
}

// ---- fee suggestion (EIP-1559) ----
export async function suggest1559Fees(rpc, { blocks = 5, rewardPercentile = 50 } = {}) {
  try {
    const hist = await rpc("eth_feeHistory", ["0x" + blocks.toString(16), "latest", [rewardPercentile]]);
    const baseFees = (hist.baseFeePerGas || []).map((h) => BigInt(h));
    const baseFee = baseFees[baseFees.length - 1] ?? 0n;
    const tips = (hist.reward || []).map((row) => BigInt(row?.[0] ?? 0));
    const maxPriorityFeePerGas = tips[tips.length - 1] || 1_000_000_000n; // 1 gwei fallback
    const maxFeePerGas = baseFee * 2n + maxPriorityFeePerGas; // safety for next block
    return { baseFee, maxPriorityFeePerGas, maxFeePerGas };
  } catch {
    const gasPrice = BigInt(await rpc("eth_gasPrice", []));
    return {
      baseFee: gasPrice,
      maxPriorityFeePerGas: gasPrice / 8n,
      maxFeePerGas: gasPrice,
    };
  }
}

// ---- manual gas estimate (no eth_estimateGas) ----
export async function manualEstimateGas(rpc, txLike, { upperCap = 10_000_000n } = {}) {
  const isPlainEth = !!txLike.to && (!txLike.data || strip0x(txLike.data) === "");
  if (isPlainEth) return 21_000n;

  const call = {
    from: txLike.from,
    to: txLike.to || null,
    value: txLike.value ? bigToHex0x(txLike.value) : "0x0",
    data: txLike.data || "0x",
  };

  let lo = 21_000n;
  let hi = 120_000n;

  // grow hi until success
  while (true) {
    try {
      await rpc("eth_call", [{ ...call, gas: bigToHex0x(hi) }, "latest"]);
      break;
    } catch (e) {
      hi *= 2n;
      if (hi > upperCap) throw new Error(`manualEstimateGas: cap ${upperCap} hit. Last error: ${e.message}`);
    }
  }

  // binary search
  while (lo + 100n < hi) {
    const mid = (lo + hi) >> 1n;
    try {
      await rpc("eth_call", [{ ...call, gas: bigToHex0x(mid) }, "latest"]);
      hi = mid;
    } catch {
      lo = mid;
    }
  }
  return hi + 500n; // small cushion
}

// ---- EIP-1559 signing payload ----
export function hashEip1559SigningPayload(tx) {
  const items = [
    rlpInt(tx.chainId),
    rlpInt(tx.nonce),
    rlpInt(tx.maxPriorityFeePerGas),
    rlpInt(tx.maxFeePerGas),
    rlpInt(tx.gasLimit),
    rlpAddr(tx.to || null),
    rlpInt(tx.value || 0n),
    rlpBytes(tx.data || "0x"),
    rlpAccessList(tx.accessList || []),
  ];
  const encoded = rlpEncodeList(items);
  const preimage = new Uint8Array([0x02, ...encoded]);
  return keccak256(preimage);
}

function splitRS(sig64) {
  return { r: sig64.slice(0, 32), s: sig64.slice(32, 64) };
}

export function signHashWithPrivKey(msgHashBytes, privKeyHex) {
  const priv = u8(privKeyHex);
  if (msgHashBytes.length !== 32) throw new Error("sign: expected 32-byte hash");

  // No options in the new API. It returns { r: bigint, s: bigint, recovery: number }
  const sig = secp256k1.sign(msgHashBytes, priv);

  // Convert bigints to minimal big-endian byte arrays (RLP expects integers, not fixed 32B)
  const rBytes = bigToBytes(BigInt(sig.r));
  const sBytes = bigToBytes(BigInt(sig.s));
  const yParity = BigInt(sig.recovery ?? 0); // 0 or 1

  return { yParity, r: rBytes, s: sBytes };
}

export function serializeEip1559Signed(tx, sig) {
  const items = [
    rlpInt(tx.chainId),
    rlpInt(tx.nonce),
    rlpInt(tx.maxPriorityFeePerGas),
    rlpInt(tx.maxFeePerGas),
    rlpInt(tx.gasLimit),
    rlpAddr(tx.to || null),
    rlpInt(tx.value || 0n),
    rlpBytes(tx.data || "0x"),
    rlpAccessList(tx.accessList || []),
    rlpInt(sig.yParity),
    rlpEncodeBytes(sig.r),
    rlpEncodeBytes(sig.s),
  ];
  const rlpBody = rlpEncodeList(items);
  const full = new Uint8Array([0x02, ...rlpBody]);
  return u8ToHex0x(full);
}

export function buildAndSignEip1559Tx(p) {
  const tx = {
    chainId: toBig(p.chainId),
    nonce: toBig(p.nonce),
    to: p.to || null,
    value: p.value ? toBig(p.value) : 0n,
    data: p.data || "0x",
    gasLimit: toBig(p.gasLimit),
    maxFeePerGas: toBig(p.maxFeePerGas),
    maxPriorityFeePerGas: toBig(p.maxPriorityFeePerGas),
    accessList: p.accessList || [],
  };
  const msgHash = hashEip1559SigningPayload(tx);
  const sig = signHashWithPrivKey(msgHash, p.privKey);
  const raw = serializeEip1559Signed(tx, sig);
  const txHash = u8ToHex0x(keccak256(hexToBytes(strip0x(raw))));
  return { raw, txHash };
}

export async function sendRawTransaction(rpc, rawTxHex) {
  return await rpc("eth_sendRawTransaction", [rawTxHex]);
}

// ---- ERC20 calldata helper ----
export function erc20TransferCalldata(to, amount) {
  const selector = "a9059cbb"; // transfer(address,uint256)
  const addr = strip0x(to).padStart(64, "0");
  const amt = toBig(amount).toString(16).padStart(64, "0");
  return "0x" + selector + addr + amt;
}