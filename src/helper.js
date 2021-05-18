const bigintConversion = require("bigint-conversion");

function bigIntToHex64(num) {
	let hex = bigintConversion.bigintToHex(num);
	if (hex.length < 64) hex = Array(64 - hex.length + 1).join("0") + hex;
	return hex;
}

function hexToBigInt(hex) {
	return BigInt("0x" + hex);
}

function evaluate(generator) {
	let value;
	for (value of generator);
	return value;
}

module.exports = { bigIntToHex64, hexToBigInt, evaluate };
