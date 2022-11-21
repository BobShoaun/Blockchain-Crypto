import { hexToBase58 } from "./conversion.js";
import SHA256 from "crypto-js/sha256.js";
import RIPEMD160 from "crypto-js/ripemd160.js";
import elliptic from "elliptic";
const ec = new elliptic.ec("secp256k1");

export const getAddressFromPublicKey = (params, publicKey) => {
  const hash1 = SHA256(publicKey).toString();
  const hash2 = RIPEMD160(hash1).toString();
  const version = params.addressPre + hash2;
  const check = SHA256(version).toString();
  const checksum = check.slice(0, params.checksumLen);
  const pkHash = version + checksum;
  return hexToBase58(pkHash);
};

export const generateKeys = params => {
  const keyPair = ec.genKeyPair();
  const secretKey = keyPair.getPrivate("hex");
  const publicKey = keyPair.getPublic().encodeCompressed("hex");
  const address = getAddressFromPublicKey(params, publicKey);
  return { secretKey, publicKey, address };
};

export const getKeys = (params, _secretKey) => {
  const keyPair = ec.keyFromPrivate(_secretKey, "hex");
  const secretKey = keyPair.getPrivate("hex");
  const publicKey = keyPair.getPublic().encodeCompressed("hex");
  const address = getAddressFromPublicKey(params, publicKey);
  return { secretKey, publicKey, address };
};

function* generateVanityAddress(params, regex, limit) {
  for (let i = 0; i < limit; i++) {
    const keys = generateKeys(params);
    if (regex.test(keys.address)) return yield keys;
    yield keys;
  }
  throw new Error(
    `Vanity address not found after ${limit} tries, try again or decrease requirements.`
  );
}

function generateBurnAddress(params, regex) {}
