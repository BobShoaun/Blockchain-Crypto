const SHA256 = require("crypto-js/sha256");
const RIPEMD160 = require("crypto-js/ripemd160");
const bs58 = require("bs58");
const EC = require("elliptic").ec;
const ec = new EC("secp256k1");

const skHex = "77D4BBDF1BCAAE8C03424035EBC9D62CC1515BAEEBF3F9DA6D352E3D0737D20D";
const keyPair = ec.keyFromPrivate(skHex, "hex");

const sk = hexToBase58(keyPair.getPrivate("hex"));
const pkHex = keyPair.getPublic().encodeCompressed("hex");
const pk = hexToBase58(keyPair.getPublic().encodeCompressed("hex"));

function hexToBase58(hex) {
	return bs58.encode(Buffer.from(hex, "hex"));
}

function base58ToHex(base58) {
	return Buffer.from(bs58.decode(base58)).toString("hex");
}

let num = 0;
while (num < 1000) {
	const sha = SHA256(pkHex).toString();
	const ripe = RIPEMD160(sha).toString();
	const ver = num.toString() + ripe;
	const check = SHA256(SHA256(ver)).toString();
	const front = check.substring(0, 4);
	const pkh = ver + front;
	const address = hexToBase58(pkh);
	if (address.startsWith("g")) {
		console.log(num, address);
		break;
	}
	num++;
}

// const sha = SHA256(pkHex).toString();
// const ripe = RIPEMD160(sha).toString();
// const ver = "06" + ripe;
// const check = SHA256(SHA256(ver)).toString();
// const front = check.substring(0, 4);
// const pkh = ver + front;
// const address = hexToBase58(pkh);
// console.log(sk);
// console.log("pk: ", pkHex);
// console.log("sha: ", sha);
// console.log(ripe);
// console.log(ver);
// console.log(check);
// console.log(front);
// console.log(pkh);
// console.log(address);
