const SHA256 = require("crypto-js/sha256");
const RIPEMD160 = require("crypto-js/ripemd160");
const bs58 = require("bs58");
const EC = require("elliptic").ec;
const ec = new EC("secp256k1");

function base58ToHex(base58) {
	return Buffer.from(bs58.decode(base58)).toString("hex");
}

function hexToBase58(hex) {
	return bs58.encode(Buffer.from(hex, "hex"));
}

function keyPairToBase58(keyPair) {
	const sk = hexToBase58(keyPair.getPrivate("hex"));
	const pk = hexToBase58(keyPair.getPublic().encodeCompressed("hex"));
	return { sk, pk };
}

function generateKeyPair() {
	const keyPair = ec.genKeyPair();
	return keyPairToBase58(keyPair);
}

// input secretKey in base58
function getKeyPair(secretKey) {
	const skHex = base58ToHex(secretKey);
	const keyPair = ec.keyFromPrivate(skHex, "hex");
	return keyPairToBase58(keyPair);
}

// new functions for new key and address algorithms
function generateKeys(params) {
	const keyPair = ec.genKeyPair();
	const skHex = keyPair.getPrivate("hex");
	const pkHex = keyPair.getPublic().encodeCompressed("hex");
	const address = getAddressFromPKHex(params, pkHex);
	const sk = hexToBase58(skHex);
	return { sk, pk: pkHex, address };
}

function getKeys(params, skB58) {
	const inputSkHex = base58ToHex(skB58);
	const keyPair = ec.keyFromPrivate(inputSkHex, "hex");
	const skHex = keyPair.getPrivate("hex");
	const pkHex = keyPair.getPublic().encodeCompressed("hex"); // hex
	const address = getAddressFromPKHex(params, pkHex);
	const sk = hexToBase58(skHex);
	return { sk, pk: pkHex, address };
}

// function getAddressFromPKB58(params, pkB58) {
// 	const pkHex = base58ToHex(pkB58);
// 	return getAddressFromPKHex(params, pkHex);
// }

function getAddressFromPKHex(params, pkHex) {
	const hash1 = SHA256(pkHex).toString();
	const hash2 = RIPEMD160(hash1).toString();
	const version = params.addressPre + hash2;
	const check = SHA256(version).toString();
	const checksum = check.slice(0, params.checksumLen);
	const pkHash = version + checksum;
	return hexToBase58(pkHash);
}

module.exports = {
	base58ToHex,
	hexToBase58,
	keyPairToBase58,
	generateKeyPair,
	getKeyPair,
	generateKeys,
	getKeys,
	getAddressFromPKHex,
	// getAddressFromPKB58,
};
