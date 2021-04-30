const {
	mineGenesisBlock,
	isBlockValid,
	mineNewBlock,
	createAndSignTransaction,
	isTransactionValid,
	generateKeyPair,
	createBlockchain,
	isBlockchainValid,
	calculateBalance,
	addBlockToBlockchain,
	calculateUTXOSet,
	getHighestValidBlock,
} = require("./CryptoClient");

const { sk: bobsk, pk: bobpk } = generateKeyPair();
const { sk: tomsk, pk: tompk } = generateKeyPair();
const { sk: ginsk, pk: ginpk } = generateKeyPair();

console.log("bob", bobpk);
console.log("tom", tompk);
console.log("gin", ginpk);

const genesis = mineGenesisBlock(bobpk);
const blockchain = createBlockchain([genesis]);

// console.log("genesis:", calculateUTXOSet(blockchain, genesis));
const t1 = createAndSignTransaction(blockchain, genesis, bobsk, bobpk, tompk, 20, 0);

const block1 = mineNewBlock(genesis, [t1], tompk);
addBlockToBlockchain(blockchain, block1);
// console.log("block1:", calculateUTXOSet(blockchain, block1));

const t2 = createAndSignTransaction(blockchain, block1, bobsk, bobpk, tompk, 30, 0);
const t3 = createAndSignTransaction(blockchain, block1, tomsk, tompk, ginpk, 70, 0);
// console.log(t2);

const block2 = mineNewBlock(block1, [t2, t3], ginpk);
addBlockToBlockchain(blockchain, block2);
// console.log("block2:", calculateUTXOSet(blockchain, block2));

// console.log(calculateUTXOSet(blockchain, block1));
// console.log(t1);

console.log(isTransactionValid(t1));
console.log(isTransactionValid(t2));
console.log(isTransactionValid(t3));

console.log(isBlockValid(genesis));
console.log(isBlockValid(block1));
console.log(isBlockValid(block2));
console.log(isBlockchainValid(blockchain, block2));

console.log("bob:", calculateBalance(blockchain, block2, bobpk));
console.log("tom:", calculateBalance(blockchain, block2, tompk));
console.log("gin:", calculateBalance(blockchain, block2, ginpk));

// const t2 = createAndSignTransaction(tomsk, tompk, bobpk, 100, 0);

// isBlockValid(genesis);
// console.log(genesis);
// console.log(block1);

// block1.transactions[0].amount = 50;
// console.log(isBlockchainValid(blockchain, block2));
// console.log(calculateBalance(blockchain, block2, bobpk));

// console.log(isBlockValid(block1));
// console.log(isBlockValid(block2));
