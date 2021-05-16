const EC = require("elliptic").ec;
const ec = new EC("curve25519");

const keyPair = ec.genKeyPair();
console.log(keyPair.getPrivate("hex"));
console.log(keyPair.getPublic("hex"));

const ee = new EC("secp256k1");

const kp = ee.genKeyPair();
console.log(kp.getPrivate("hex"));
console.log(kp.getPublic().encodeCompressed("hex"));
