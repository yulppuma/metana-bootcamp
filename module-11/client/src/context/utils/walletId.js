//Determines the corresponding account given a wallet's mnemonic
import { keccak256 } from "ethereum-cryptography/keccak";
import { utf8ToBytes, bytesToHex } from "ethereum-cryptography/utils";

export function normalizeMnemonic(m) {
  return m.trim().toLowerCase().replace(/\s+/g, " ");
}

export function walletIdFromMnemonic(mnemonic) {
  const norm = normalizeMnemonic(mnemonic);
  const h = keccak256(utf8ToBytes(norm)); // sync
  return `w_${bytesToHex(h).slice(0, 24)}`; // short, deterministic local key
}