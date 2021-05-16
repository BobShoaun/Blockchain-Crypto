const { generateKeyPairSync } = require("crypto");
const CryptoJS = require("crypto-js");

const { privateKey, publicKey } = generateKeyPairSync("ec", {
	namedCurve: "sect239k1",
});

// privateKey.export();

// console.log(privateKey.export({ type: "sec1", format: "der" }).format("der"));

var bs58 = require("bs58");
const EC = require("elliptic").ec;
var EdDSA = require("elliptic").eddsa;
const ec = new EC("secp256k1");
const ed = new EdDSA("ed25519");
const ee = new EC("curve25519");

const keyPair = ec.genKeyPair();

console.log("private base 58:       ", bs58.encode(Buffer.from(keyPair.getPrivate("hex"), "hex")));
const pk = bs58.encode(Buffer.from(keyPair.getPublic().encodeCompressed("hex"), "hex"));

console.log("public base 58:        ", pk);
console.log("private hex:           ", keyPair.getPrivate("hex"));
console.log("public hex:            ", keyPair.getPublic("hex"));
console.log("public hex compressed: ", keyPair.getPublic().encodeCompressed("hex"));

// console.log(Buffer.from("hello").toString("hex"));
const sig = keyPair.sign("00ffdd44fgnghg", "hex").toDER("hex");

console.log("signature: ", sig);
console.log(
	"signature2: ",
	ec.sign("hello", keyPair.getPrivate("hex"), "hex", { canonical: true }).toDER("hex")
);

const decodedPk = Buffer.from(bs58.decode(pk)).toString("hex");
console.log("decoded: ", decodedPk);

const checkKeyPair = ec.keyFromPublic(decodedPk, "hex");
console.log(checkKeyPair.getPublic("hex"));
const valid = checkKeyPair.verify("00ffdd44fgnghg", sig);
console.log("valid: ", valid);

// const testEncode = bs58.encode(Buffer.from("hello world", "hex"));
const testDecode = Buffer.from(bs58.decode("heoword")).toString("hex");
const kp = ec.keyFromPrivate(testDecode, "hex");
console.log(kp.getPrivate("hex"));
const testEncode = bs58.encode(Buffer.from(testDecode, "hex"));
console.log(testDecode);
console.log(testEncode);

// Create and initialize EdDSA context
// (better do it once and reuse it)

// Create key pair from secret
// var key = ee.keyFromPrivate("f0cbc0d".toString("hex")); // hex string, array or Buffer

// Sign the message's hash (input must be an array, or a hex-string)
// var msgHash = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
// var signature = key.sign(msgHash).toHex();

// Verify signature
// console.log(key.verify(msgHash, signature));

// let key1 = ee.genKeyPair();

// var words = CryptoJS.enc.Utf8.parse(key1.getPrivate("hex")); // WordArray object
// var base64 = CryptoJS.enc.Base64.stringify(words);
