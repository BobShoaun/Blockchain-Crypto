import SHA256 from "crypto-js/sha256.js";
import { setDefaultWordlist, validateMnemonic } from "bip39";
import { base58ToHex } from "./conversion.js";
import elliptic from "elliptic";

const ec = new elliptic.ec("secp256k1");

export const isAddressValid = (params, address) => {
  try {
    const pkHash = base58ToHex(address);
    const checksum = pkHash.slice(pkHash.length - params.checksumLen);
    const version = pkHash.slice(0, pkHash.length - params.checksumLen);
    const check = SHA256(version).toString();
    return check.slice(0, params.checksumLen) === checksum;
  } catch {
    return false;
  }
};

export const isSignatureValid = (signature, publicKey, data) => {
  try {
    const key = ec.keyFromPublic(publicKey, "hex");
    return key.verify(data, signature);
  } catch {
    return false;
  }
};

export const isMnemonicValid = (mnemonic, wordlist) => {
  setDefaultWordlist(wordlist);
  return validateMnemonic(mnemonic);
};
