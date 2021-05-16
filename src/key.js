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

// TODO: add checksum
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

module.exports = {
	base58ToHex,
	hexToBase58,
	keyPairToBase58,
	generateKeyPair,
	getKeyPair,
};
