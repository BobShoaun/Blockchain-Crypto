const {
	mineGenesisBlock,
	isBlockValid,
	mineNewBlock,
	createAndSignTransaction,
	isTransactionValid,
	createBlockchain,
	isBlockchainValid,
	calculateBalance,
	addBlockToBlockchain,
	calculateUTXOSet,
	getHighestValidBlock,
	generateKeyPair,
	getKeyPair,
	calculateMempool,
	isTransactionValidInBlockchain,
	generateKeys,
	getKeys,
	isAddressValid,
	findUTXOs,
	createCoinbaseTransaction,
	resetTransactionSets,
	resetUtxoSets,
	getTxBlock,
	getBlockConfirmations,
} = require("../../index");

const { evaluate } = require("../helper");
const { isCoinbaseTxValid, isBlockValidInBlockchain } = require("../validation");

// consensus parameters
const params = {
	name: "Bobcoin",
	symbol: "XBC",
	coin: 100_000_000, // amounts are stored as the smallest unit, this is how many of the smallest unit that amounts to 1 coin.
	version: 1,
	addressPre: "06",
	checksumLen: 4,
	initBlkReward: 500 * 100_000_000, // in coins
	blkRewardHalflife: 10, // in block height
	initBlockDiff: 1,
	initHashTarg: "0fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
	targBlkTime: 5 * 60, // 5 minutes in seconds
	diffRecalcHeight: 20, // in block height
	minDiffCorrFact: 1 / 4,
	maxDiffCorrFact: 4,
	blkMaturity: 8, // number of blocks that has to be mined on top (confirmations + 1) to be considered matured
	hardCap: 500_000_000 * 100_000_000, // upper bound to amt of coins in circulation
	/*

  infinite sum of: 
  (blkRewardHalflife * initBlkReward) / 2 ^ n 
  from n = 0 -> inf
  gives us the hardCap.

  blkRewardHalflife: 100_000
  initBlkReward: 4096 * coin
  give us hardCap: 819_200_000 * coin 

  */
};

const { sk: bobsk, pk: bobpk, address: bobad } = getKeys(params, "bob");
const { sk: tomsk, pk: tompk, address: tomad } = getKeys(params, "tom");
const { sk: ginsk, pk: ginpk, address: ginad } = getKeys(params, "gina");

function candsTx(p, bc, hb, txs, ssk, ad, amt, fee) {
	const { sk, pk, address } = getKeys(p, ssk);
	const utxos = findUTXOs(bc, hb, txs, address, amt + fee);
	return createAndSignTransaction(p, utxos, sk, pk, address, ad, amt, fee);
}

function initGen() {
	resetTransactionSets();
	resetUtxoSets();
	const transactions = [];
	const blockchain = createBlockchain([]);
	const cb = createCoinbaseTransaction(params, blockchain, null, [], bobad);
	transactions.push(cb);
	const genesis = mineGenesisBlock(params, [cb]);
	addBlockToBlockchain(blockchain, genesis);
	return [blockchain, transactions, genesis];
}

test("public key and address generation", () => {
	const { sk, pk, address } = getKeys(params, "bob");
	expect(sk).toBe("bob");
	expect(pk).toBe("03693d34975550699c492463b8b299ccf70e43bae8bc409f9e0c7be0218f42173a");
	expect(address).toBe("8obdgEpD9kqU8RqAH6j53j9bX2U62VV");
	expect(isAddressValid(params, address)).toBe(true);
	expect(isAddressValid(params, "8obdgEpD9kqU8RqAH6j53j9bX2U62Vv")).toBe(false);

	const { sk: skt, pk: pkt, address: addresst } = getKeys(params, "tom");
	expect(skt).toBe("tom");
	expect(pkt).toBe("03be06b826ddf2a2fd9be6bb31d2b4a762460f1472e89091e996aa223f6c844a9e");
	expect(addresst).toBe("8YcsQ8ANhQYQgZLWMHLW2G7JkKYVbyd");
	expect(isAddressValid(params, addresst)).toBe(true);
});

test("Genesis", () => {
	const [blockchain, transactions, genesis] = initGen();
	expect(isBlockchainValid(params, blockchain, genesis)).toBe(true);
});

test("Simplest Case", () => {
	const [blockchain, transactions, genesis] = initGen();
	const tx1 = candsTx(params, blockchain, genesis, transactions, bobsk, tomad, 20, 0);
	transactions.push(tx1);
	const cb1 = createCoinbaseTransaction(params, blockchain, genesis, [tx1], bobad);
	transactions.push(cb1);
	const block1 = evaluate(mineNewBlock(params, blockchain, genesis, [cb1, tx1]));
	addBlockToBlockchain(blockchain, block1);
	expect(isBlockchainValid(params, blockchain, block1)).toBe(true);
});

test("Mempool Simplest Case", () => {
	const [blockchain, transactions, genesis] = initGen();
	const tx1 = candsTx(params, blockchain, genesis, transactions, bobsk, tomad, 20, 0);
	transactions.push(tx1);
	const mp1 = calculateMempool(blockchain, genesis, transactions);
	const cb1 = createCoinbaseTransaction(params, blockchain, genesis, mp1, bobad);
	transactions.push(cb1);
	const block1 = evaluate(mineNewBlock(params, blockchain, genesis, [cb1, ...mp1]));
	addBlockToBlockchain(blockchain, block1);
	expect(isBlockchainValid(params, blockchain, block1)).toBe(true);
});

test("Multiple Tx per Block", () => {
	const [blockchain, transactions, genesis] = initGen();

	const tx1 = candsTx(params, blockchain, genesis, transactions, bobsk, tomad, 20, 0);
	transactions.push(tx1);

	const tx2 = candsTx(params, blockchain, genesis, transactions, bobsk, ginad, 21, 0);
	transactions.push(tx2);

	const cb1 = createCoinbaseTransaction(params, blockchain, genesis, [tx1, tx2], tomad);
	transactions.push(cb1);

	const block1 = evaluate(mineNewBlock(params, blockchain, genesis, [cb1, tx1, tx2]));
	addBlockToBlockchain(blockchain, block1);

	expect(isBlockchainValid(params, blockchain, block1)).toBe(true);

	const tx3 = candsTx(params, blockchain, block1, transactions, bobsk, ginad, 9, 0);
	transactions.push(tx3);

	const tx4 = candsTx(params, blockchain, block1, transactions, tomsk, bobad, 30, 0);
	transactions.push(tx4);

	const tx5 = candsTx(params, blockchain, block1, transactions, ginsk, bobad, 20, 0);
	transactions.push(tx5);

	const cb2 = createCoinbaseTransaction(params, blockchain, block1, [tx3, tx4, tx5], bobad);
	transactions.push(cb2);

	const block2 = evaluate(mineNewBlock(params, blockchain, block1, [cb2, tx3, tx4, tx5]));
	addBlockToBlockchain(blockchain, block2);
	// console.log(JSON.stringify(blockchain, null, 2));
	expect(isBlockchainValid(params, blockchain, block2)).toBe(true);
});

test("Overspend within Block", () => {
	const p = { ...params, initBlkReward: 50 };
	const [blockchain, transactions, genesis] = initGen();

	const tx1 = candsTx(p, blockchain, genesis, transactions, bobsk, tomad, 20, 0);
	transactions.push(tx1);

	const tx2 = candsTx(p, blockchain, genesis, transactions, bobsk, ginad, 20, 0);
	transactions.push(tx2);

	const tx3 = candsTx(p, blockchain, genesis, transactions, bobsk, ginad, 11, 0); // overspend
	transactions.push(tx3);

	const cb1 = createCoinbaseTransaction(p, blockchain, genesis, [tx1, tx2, tx3], bobad);
	transactions.push(cb1);

	const block1 = evaluate(mineNewBlock(p, blockchain, genesis, [cb1, tx1, tx2, tx3]));
	addBlockToBlockchain(blockchain, block1);

	expect(() => isBlockchainValid(p, blockchain, block1)).toThrow();
});

test("confirmations and txblock", () => {
	const [blockchain, transactions, genesis] = initGen();

	const tx1 = candsTx(params, blockchain, genesis, transactions, bobsk, ginad, 11, 0);
	transactions.push(tx1);

	const tx2 = candsTx(params, blockchain, genesis, transactions, bobsk, ginad, 20, 0);
	transactions.push(tx2);

	const cb1 = createCoinbaseTransaction(params, blockchain, genesis, [tx1, tx2], ginad);
	transactions.push(cb1);

	const block1 = evaluate(mineNewBlock(params, blockchain, genesis, [cb1, tx1, tx2]));
	addBlockToBlockchain(blockchain, block1);

	expect(getBlockConfirmations(blockchain, block1)).toBe(1);
	expect(getBlockConfirmations(blockchain, genesis)).toBe(2);

	const tx3 = candsTx(params, blockchain, block1, transactions, ginsk, tomad, 2, 0);
	transactions.push(tx3);

	const cb2 = createCoinbaseTransaction(params, blockchain, block1, [tx3], bobad);
	transactions.push(cb2);

	const block2 = evaluate(mineNewBlock(params, blockchain, block1, [cb2, tx3]));
	addBlockToBlockchain(blockchain, block2);

	expect(getBlockConfirmations(blockchain, genesis)).toBe(3);
	expect(getBlockConfirmations(blockchain, block1)).toBe(2);
	expect(getBlockConfirmations(blockchain, block2)).toBe(1);

	const tx4 = candsTx(params, blockchain, block2, transactions, bobsk, tomad, 22, 0);
	transactions.push(tx4);

	expect(getTxBlock(blockchain, tx1)).toBe(block1);
	expect(getTxBlock(blockchain, tx3)).toBe(block2);
	expect(getTxBlock(blockchain, cb2)).toBe(block2);
	expect(getTxBlock(blockchain, tx4)).toBe(null);
});

test("tx and block validations", () => {
	const [blockchain, transactions, genesis] = initGen();

	const tx1 = candsTx(params, blockchain, genesis, transactions, bobsk, ginad, 11, 0);
	transactions.push(tx1);

	const tx2 = candsTx(params, blockchain, genesis, transactions, bobsk, ginad, 20, 0);
	transactions.push(tx2);

	const cb1 = createCoinbaseTransaction(params, blockchain, genesis, [tx1, tx2], ginad);
	transactions.push(cb1);

	const block1 = evaluate(mineNewBlock(params, blockchain, genesis, [cb1, tx1, tx2]));
	addBlockToBlockchain(blockchain, block1);

	expect(isTransactionValid(params, tx1)).toBe(true);
	expect(isTransactionValid(params, tx2)).toBe(true);
	expect(isCoinbaseTxValid(params, cb1)).toBe(true);
	expect(isBlockValidInBlockchain(params, blockchain, genesis)).toBe(true);
	expect(isBlockValidInBlockchain(params, blockchain, block1)).toBe(true);

	const tx3 = candsTx(params, blockchain, block1, transactions, ginsk, tomad, 2, 0);
	transactions.push(tx3);

	const cb2 = createCoinbaseTransaction(params, blockchain, block1, [tx3], bobad);
	transactions.push(cb2);

	const block2 = evaluate(mineNewBlock(params, blockchain, block1, [cb2, tx3]));
	addBlockToBlockchain(blockchain, block2);

	expect(isTransactionValid(params, tx3)).toBe(true);
	expect(isCoinbaseTxValid(params, cb2)).toBe(true);
	expect(isBlockValidInBlockchain(params, blockchain, genesis)).toBe(true);
	expect(isBlockValidInBlockchain(params, blockchain, block1)).toBe(true);
	expect(isBlockValidInBlockchain(params, blockchain, block2)).toBe(true);

	const tx4 = candsTx(params, blockchain, block2, transactions, bobsk, tomad, 22, 0);
	transactions.push(tx4);

	expect(isTransactionValid(params, tx4)).toBe(true);
});
