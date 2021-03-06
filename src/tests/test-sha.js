const SHA256 = require("crypto-js/sha256");
const bigintConversion = require("bigint-conversion");

const { evaluate } = require("../helper");
// const hash = SHA256("hello").toString();

// console.log("0x" + hash);
// console.log(parseInt("0x" + hash, 16));

// console.log(
// 	BigInt("0x" + hash) >=
// 		20329878786436204988385760252021328656300425018755239228739303522659023427620n
// );

// 	"ffffffffff_ffffffffff_ffffffffff_ffffffffff_ffffffffff_ffffffffff_ffff"
// );

function bnToHex(bn) {
	bn = BigInt(bn);

	var pos = true;
	if (bn < 0) {
		pos = false;
		bn = bitnot(bn);
	}

	var hex = bn.toString(16);
	if (hex.length % 2) {
		hex = "0" + hex;
	}

	if (pos && 0x80 & parseInt(hex.slice(0, 2), 16)) {
		hex = "00" + hex;
	}

	return hex;
}

function bigintToHex(num) {
	let hex = bigintConversion.bigintToHex(num);
	if (hex.length < 64) {
		hex = Array(64 - hex.length + 1).join("0") + hex;
	}
	return hex;
}

const initialHashTarget = "0000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
const targetValue = BigInt("0x" + initialHashTarget);

function hello(targetCallback) {
	return mine("niceee", targetCallback);
}

function* mine(text, targetCallback) {
	let nonce = 0;

	targetCallback?.(bigintToHex(targetValue));
	while (true) {
		let hash = SHA256(text + nonce).toString();
		const hashValue = BigInt("0x" + hash);
		if (hashValue <= targetValue) {
			console.log("mining successful!");
			// console.log("found: ", hash);
			// console.log("target: ", initialHashTarget);
			// console.log("nonce: ", nonce);
			return yield { hash, nonce };
			// return;
		}
		nonce++;
		yield { nonce };
	}
}

let block = {};
for (block of hello(target => console.log("taget is: ", target))) {
	if (block.nonce % 10000 === 0) console.log(block.nonce);
}
console.log(block);

const b = evaluate(hello(target => console.log("taget is: ", target)));
console.log(b);

return;

console.log(hex);
console.log(initialHashTarget);
// return;

while (true) {
	let hash = SHA256("hellofd" + nonce).toString();
	const value = BigInt("0x" + hash);
	if (nonce % 100000 === 0) {
		console.log("nonce reached: ", nonce);
	}
	if (value < num) {
		console.log("mining successful!");
		console.log("found: ", hash);
		console.log("target: ", hex);
		console.log("nonce: ", nonce);
		break;
	}
	nonce++;
}

console.log();

console.log(BigInt("0x00000000FFFFFFFFF00000000000000000000000000000000") / 10n);
