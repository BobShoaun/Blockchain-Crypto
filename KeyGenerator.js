const EC = require("elliptic").ec;
const ec = new EC("secp256k1");

function generateKeyPair() {
	return ec.genKeyPair();
}

function getKeyPair(privateKey) {
	return ec.keyFromPrivate(privateKey, "hex");
}

module.exports = { generateKeyPair, getKeyPair };
