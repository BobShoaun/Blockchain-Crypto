const bigintConversion = require("bigint-conversion");

console.log(BigInt("0x0000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"));

const newHash =
	BigInt("0x0000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff") /
	BigInt(Math.trunc(29));

let hex = bigintConversion.bigintToHex(newHash);
if (hex.length < 64) {
	hex = Array(64 - hex.length + 1).join("0") + hex;
}

console.log(newHash);

console.log("0000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
console.log(hex);
