const bigintConversion = require("bigint-conversion");

function bigintToHex64(num) {
	let hex = bigintConversion.bigintToHex(num);
	if (hex.length < 64) hex = Array(64 - hex.length + 1).join("0") + hex;
	return hex;
}

function evaluate(generator) {
	let value;
	for (value of generator);
	return value;
}

module.exports = { bigintToHex64, evaluate };
