const HMACSHA256 = require("crypto-js/hmac-sha512");
const bip39 = require("bip39");

const EC = require("elliptic").ec;
const ec = new EC("secp256k1");
const bs58 = require("bs58");

const HdKey = require("hdkey");

function hexToBase58(hex) {
	return bs58.encode(Buffer.from(hex, "hex"));
}

const testSeed =
	"a0c42a9c3ac6abf2ba6a9946ae83af18f51bf1c9fa7dacc4c92513cc4dd015834341c775dcd4c0fac73547c5662d81a9e9361a0aac604a73a321bd9103bce8af";

(async function () {
	const mnemonic = bip39.generateMnemonic();
	// console.log(mnemonic);
	const seed = (await bip39.mnemonicToSeed(mnemonic, "mnemonic")).toString("hex");

	// console.log(seed);

	const hdkey = HdKey.fromMasterSeed(Buffer.from(testSeed, "hex"));
	console.log("xprv: ", hdkey.privateExtendedKey);
	console.log("xpub: ", hdkey.publicExtendedKey);
	console.log("sk: ", hdkey.privateKey.toString("hex"));
	console.log("pk: ", hdkey.publicKey.toString("hex"));

	const key = ec.keyFromPrivate(hdkey.privateKey);
	console.log("pk: ", key.getPublic().encodeCompressed("hex"));

	const hdkey2 = HdKey.fromExtendedKey(hdkey.publicExtendedKey);
	console.log(hdkey2.publicKey.toString("hex"));

	// const childKey = hdkey2.derive("m/0/0'");
	// console.log(childKey.publicExtendedKey);

	const childKey2 = hdkey.derive("m/44'/1'/0'/0/0");
	console.log(childKey2.publicExtendedKey);

	// const childKey3 = childKey2.derive("M/0'");
	// console.log(childKey3.privateExtendedKey);

	// => 'xprv9s21ZrQH143K2SKJK9EYRW3Vsg8tWVHRS54hAJasj1eGsQXeWDHLeuu5hpLHRbeKedDJM4Wj9wHHMmuhPF8dQ3bzyup6R7qmMQ1i1FtzNEW'
	// => 'xpub661MyMwAqRbcEvPmRAmYndzERhyNux1GoHzHxgzVHMBFkCro3kbbCiDZZ5XabZDyXPj5mH3hktvkjhhUdCQxie5e1g4t2GuAWNbPmsSfDp2'
})();
