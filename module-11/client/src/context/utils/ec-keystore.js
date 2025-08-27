// Keystore-like encryption for secrets using ethereum-cryptography
import { scrypt as scryptAsync } from "ethereum-cryptography/scrypt.js";
import { pbkdf2 as pbkdf2Async } from "ethereum-cryptography/pbkdf2.js";
import { keccak256 } from "ethereum-cryptography/keccak.js";
import * as aes from "ethereum-cryptography/aes.js";
import { getRandomBytesSync } from "ethereum-cryptography/random.js";
import { utf8ToBytes, bytesToHex as toHex, hexToBytes } from "ethereum-cryptography/utils.js";

// ---- password verifier (non-reversible, PBKDF2) ----
export async function makePasswordVerifier(password) {
  const salt = getRandomBytesSync(16);
  const iters = 131072; // slow enough for browser, adjust as you like
  const dkLen = 32;
  const hash = await pbkdf2Async(utf8ToBytes(password), salt, iters, dkLen, "sha256");
  return {
    algo: "pbkdf2-sha256",
    salt: toHex(salt),
    iterations: iters,
    dkLen,
    hash: toHex(hash),
  };
}

export async function verifyPassword(password, verifier) {
  const { salt, iterations, dkLen } = verifier;
  const calc = await pbkdf2Async(utf8ToBytes(password), hexToBytes(salt), iterations, dkLen, "sha256");
  return toHex(calc) === verifier.hash;
}

// ---- keystore (encrypt a secret string with a password) ----
// Uses scrypt to derive key, AES-128-CTR for encryption, keccak256 MAC like geth's v3 style.
export async function encryptSecretWithPassword(secretString, password) {
  const salt = getRandomBytesSync(32);
  const N = 262144, r = 8, p = 1, dkLen = 32;
  const derivedKey = await scryptAsync(utf8ToBytes(password), salt, N, r, p, dkLen);

  // AES-128-CTR uses 16-byte key. Take first 16 bytes for cipher key.
  const aesKey = derivedKey.slice(0, 16);
  const iv = getRandomBytesSync(16);
  const plaintext = utf8ToBytes(secretString);
  const ciphertext = aes.encrypt(plaintext, aesKey, iv, "aes-128-ctr"); // PKCS7 default per docs

  // MAC = keccak256(derivedKey[16..32] ++ ciphertext)
  const mac = keccak256(new Uint8Array([...derivedKey.slice(16, 32), ...ciphertext]));

  return {
    version: 1,
    cipher: "aes-128-ctr",
    ciphertext: toHex(ciphertext),
    cipherparams: { iv: toHex(iv) },
    kdf: "scrypt",
    kdfparams: { N, r, p, dkLen, salt: toHex(salt) },
    mac: toHex(mac),
  };
}

export async function decryptSecretWithPassword(keystore, password) {
  const { kdfparams, cipherparams, ciphertext, mac } = keystore;
  const { N, r, p, dkLen, salt } = kdfparams;

  const derivedKey = await scryptAsync(utf8ToBytes(password), hexToBytes(salt), N, r, p, dkLen);
  const ctBytes = hexToBytes(ciphertext);
  const expectMac = keccak256(new Uint8Array([...derivedKey.slice(16, 32), ...ctBytes]));
  if (toHex(expectMac) !== mac) throw new Error("Bad password or tampered data");

  const aesKey = derivedKey.slice(0, 16);
  const iv = hexToBytes(cipherparams.iv);
  const pt = aes.decrypt(ctBytes, aesKey, iv, "aes-128-ctr");
  return new TextDecoder().decode(pt);
}
