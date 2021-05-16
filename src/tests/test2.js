const EC = require('elliptic').ec;
const ec = new EC('secp256k1');
const SHA256 = require("crypto-js/sha256");

const key = ec.genKeyPair();
const publicKey = key.getPublic('hex');
const privateKey = key.getPrivate('hex');

console.log("public: ", publicKey);
console.log("private: ", privateKey);

let signature = key.sign(SHA256("hello").toString(), 'base64').toDER('hex');
console.log("signature: ", signature);

const test = ec.keyFromPublic(publicKey, 'hex');
// console.log(test.getPrivate('hex'));

console.log(test.verify(SHA256(" hello").toString(), signature));


const test2 = ec.keyFromPrivate("good", 'hex');
console.log("public: ", test2.getPublic('hex'));
console.log("private: ", test2.getPrivate('hex'));
