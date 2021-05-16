const { Cryptocurrency, Transaction } = require('./Cryptocurrency');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

let bobcoin = new Cryptocurrency();
let bob = ec.genKeyPair();
let tom = ec.genKeyPair();
let gina = ec.genKeyPair();

// console.log(bobcoin.heighestBlock)

let t1 = new Transaction(bob.getPublic('hex'), tom.getPublic('hex'), 100);
t1.sign(bob.getPrivate('hex'));
bobcoin.addTransaction(t1);

let t2 = new Transaction(tom.getPublic('hex'), gina.getPublic('hex'), 50);
t2.sign(tom.getPrivate('hex'));
bobcoin.addTransaction(t2);

let block1 = bobcoin.mineTransactions(bob.getPublic('hex'), bobcoin.getMempool(bobcoin.highestBlock), bobcoin.highestBlock);

let t3 = new Transaction(tom.getPublic('hex'), bob.getPublic('hex'), 25);
t3.sign(tom.getPrivate('hex'));
bobcoin.addTransaction(t3);

let t4 = new Transaction(bob.getPublic('hex'), gina.getPublic('hex'), 10);
t4.sign(bob.getPrivate('hex'));
bobcoin.addTransaction(t4);

let block2 = bobcoin.mineTransactions(gina.getPublic('hex'), bobcoin.getMempool(block1), bobcoin.highestBlock);

console.log(JSON.stringify(bobcoin.chain, null, 2));

console.log("bob: ", bobcoin.getBalance(bob.getPublic('hex')));
console.log("tom: ", bobcoin.getBalance(tom.getPublic('hex')));
console.log("gina: ", bobcoin.getBalance(gina.getPublic('hex')));

// bobcoin.chain[2].data[1].amount = -10;
console.log("valid: ", bobcoin.isValid);