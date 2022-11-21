import { bigintToHex } from "bigint-conversion";
import bs58 from "bs58";

export const bigIntToHex64 = (num) => {
  const hex = bigintToHex(num);
  if (hex.length < 64) return Array(64 - hex.length + 1).join("0") + hex;
  return hex;
};

export const hexToBigInt = (hex) => BigInt("0x" + hex);

export const base58ToHex = (base58) =>
  Buffer.from(bs58.decode(base58)).toString("hex");

export const hexToBase58 = (hex) => bs58.encode(Buffer.from(hex, "hex"));
