const {
	mineGenesisBlock,
	isTransactionValid,
	createBlockchain,
	isBlockchainValid,
	addBlock,
	calculateUTXOSet,
	getHighestValidBlock,
	calculateMempool,
	getKeys,
	isAddressValid,
	resetTransactionSets,
	resetUtxoSets,
	getTxBlock,
	getBlockConfirmations,
	calculateHashTarget,
	mineBlock,
	evaluate,
	createBlock,
	isCoinbaseTxValid,
	isBlockValidInBlockchain,
	createTransaction,
	createInput,
	createOutput,
	signTransaction,
	calculateTransactionHash,
	calculateMempoolUTXOSet,
	updateUTXOSet,
	calculateBlockReward,
	findTXO,
	getTransactionFees,
	RESULT,
} = require("../../index");

// consensus parameters
const params = {
	name: "Bobcoin",
	symbol: "XBC",
	coin: 100_000_000, // amounts are stored as the smallest unit, this is how many of the smallest unit that amounts to 1 coin.
	version: "1.0.0",
	addressPre: "06",
	checksumLen: 4,
	initBlkReward: 500 * 100_000_000, // in coins
	blkRewardHalflife: 10, // in block height
	initBlkDiff: 1,
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

function candsTx(params, blockchain, headBlock, transactions, senderSK, recipientAdd, amount, fee) {
	const { sk, pk, address } = getKeys(params, senderSK);

	// get utxos from mempool
	const utxoSet = calculateMempoolUTXOSet(blockchain, headBlock, transactions);

	// pick utxos from front to back.
	let inputAmount = 0;
	const inputs = [];
	for (const utxo of utxoSet) {
		if (inputAmount >= amount) break;
		if (utxo.address !== address) continue;
		inputAmount += utxo.amount;
		const input = createInput(utxo.txHash, utxo.outIndex, pk);
		inputs.push(input);
	}

	// if (inputAmount < amount) throw Error("Not enough UTXO to spend");

	const outputs = [];
	const payment = createOutput(recipientAdd, amount);
	outputs.push(payment);

	const changeAmount = inputAmount - amount - fee;
	if (changeAmount > 0) {
		const change = createOutput(address, changeAmount);
		outputs.push(change);
	}

	const transaction = createTransaction(params, inputs, outputs);
	const signature = signTransaction(transaction, sk);
	transaction.inputs.forEach(input => (input.signature = signature));

	transaction.hash = calculateTransactionHash(transaction); // txHash used for referencing
	return transaction;
}

function createCoinbaseTransaction(params, transactions, headBlock, txsToMine, miner) {
	const fees = txsToMine.reduce((total, tx) => total + getTransactionFees(transactions, tx), 0);
	const output = createOutput(miner, calculateBlockReward(params, headBlock.height + 1) + fees);
	const coinbase = createTransaction(params, [], [output]);
	coinbase.hash = calculateTransactionHash(coinbase);
	return coinbase;
}

function mineNewBlock(params, blockchain, headBlock, transactions) {
	const block = createBlock(params, blockchain, headBlock, transactions);
	const target = calculateHashTarget(params, block);
	return evaluate(mineBlock(block, target));
}

function initGen(params) {
	resetTransactionSets();
	resetUtxoSets();
	const transactions = [];
	const blockchain = createBlockchain([]);
	const output = createOutput(bobad, params.initBlkReward);
	const coinbase = createTransaction(params, [], [output]);
	coinbase.hash = calculateTransactionHash(coinbase);
	const genesis = mineGenesisBlock(params, [coinbase]);
	transactions.push(coinbase);
	addBlock(blockchain, genesis);
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
	const [blockchain, transactions, genesis] = initGen(params);
	expect(isBlockchainValid(params, blockchain, genesis).code).toBe(RESULT.VALID);
});

test("Simplest Case", () => {
	const [blockchain, transactions, genesis] = initGen(params);
	const tx1 = candsTx(params, blockchain, genesis, transactions, bobsk, tomad, 20, 0);
	transactions.push(tx1);
	const cb1 = createCoinbaseTransaction(params, transactions, genesis, [tx1], bobad);
	transactions.push(cb1);
	const block1 = mineNewBlock(params, blockchain, genesis, [cb1, tx1]);
	addBlock(blockchain, block1);
	expect(isBlockchainValid(params, blockchain, block1).code).toBe(RESULT.VALID);
});

test("Mempool Simplest Case", () => {
	const [blockchain, transactions, genesis] = initGen(params);
	const tx1 = candsTx(params, blockchain, genesis, transactions, bobsk, tomad, 20, 0);
	transactions.push(tx1);
	const mp1 = calculateMempool(blockchain, genesis, transactions);
	const cb1 = createCoinbaseTransaction(params, transactions, genesis, mp1, bobad);
	transactions.push(cb1);
	const block1 = mineNewBlock(params, blockchain, genesis, [cb1, ...mp1]);
	addBlock(blockchain, block1);
	expect(isBlockchainValid(params, blockchain, block1).code).toBe(RESULT.VALID);
});

test("Multiple Tx per Block", () => {
	const [blockchain, transactions, genesis] = initGen(params);

	const tx1 = candsTx(params, blockchain, genesis, transactions, bobsk, tomad, 20, 0);
	transactions.push(tx1);

	const tx2 = candsTx(params, blockchain, genesis, transactions, bobsk, ginad, 21, 0);
	transactions.push(tx2);

	const cb1 = createCoinbaseTransaction(params, transactions, genesis, [tx1, tx2], tomad);
	transactions.push(cb1);

	const block1 = mineNewBlock(params, blockchain, genesis, [cb1, tx1, tx2]);
	addBlock(blockchain, block1);

	expect(isBlockchainValid(params, blockchain, block1).code).toBe(RESULT.VALID);

	const tx3 = candsTx(params, blockchain, block1, transactions, bobsk, ginad, 9, 0);
	transactions.push(tx3);

	const tx4 = candsTx(params, blockchain, block1, transactions, tomsk, bobad, 30, 0);
	transactions.push(tx4);

	const tx5 = candsTx(params, blockchain, block1, transactions, ginsk, bobad, 20, 0);
	transactions.push(tx5);

	const cb2 = createCoinbaseTransaction(params, transactions, block1, [tx3, tx4, tx5], bobad);
	transactions.push(cb2);

	const block2 = mineNewBlock(params, blockchain, block1, [cb2, tx3, tx4, tx5]);
	addBlock(blockchain, block2);
	// console.log(JSON.stringify(blockchain, null, 2));
	expect(isBlockchainValid(params, blockchain, block2).code).toBe(RESULT.VALID);
});

test("Overspend within Block", () => {
	const p = { ...params, initBlkReward: 50 };
	const [blockchain, transactions, genesis] = initGen(p);

	const tx1 = candsTx(p, blockchain, genesis, transactions, bobsk, tomad, 20, 0);
	transactions.push(tx1);

	const tx2 = candsTx(p, blockchain, genesis, transactions, bobsk, ginad, 20, 0);
	transactions.push(tx2);

	const tx3 = candsTx(p, blockchain, genesis, transactions, bobsk, ginad, 11, 0); // overspend
	transactions.push(tx3);

	const cb1 = createCoinbaseTransaction(p, transactions, genesis, [tx1, tx2, tx3], bobad);
	transactions.push(cb1);

	const block1 = mineNewBlock(p, blockchain, genesis, [cb1, tx1, tx2, tx3]);
	addBlock(blockchain, block1);

	expect(isBlockchainValid(p, blockchain, block1).code).toBe(RESULT.TX06);
});

test("confirmations and txblock", () => {
	const [blockchain, transactions, genesis] = initGen(params);

	const tx1 = candsTx(params, blockchain, genesis, transactions, bobsk, ginad, 11, 0);
	transactions.push(tx1);

	const tx2 = candsTx(params, blockchain, genesis, transactions, bobsk, ginad, 20, 0);
	transactions.push(tx2);

	const cb1 = createCoinbaseTransaction(params, transactions, genesis, [tx1, tx2], ginad);
	transactions.push(cb1);

	const block1 = mineNewBlock(params, blockchain, genesis, [cb1, tx1, tx2]);
	addBlock(blockchain, block1);

	expect(getBlockConfirmations(blockchain, block1)).toBe(1);
	expect(getBlockConfirmations(blockchain, genesis)).toBe(2);

	const tx3 = candsTx(params, blockchain, block1, transactions, ginsk, tomad, 2, 0);
	transactions.push(tx3);

	const cb2 = createCoinbaseTransaction(params, transactions, block1, [tx3], bobad);
	transactions.push(cb2);

	const block2 = mineNewBlock(params, blockchain, block1, [cb2, tx3]);
	addBlock(blockchain, block2);

	expect(getBlockConfirmations(blockchain, genesis)).toBe(3);
	expect(getBlockConfirmations(blockchain, block1)).toBe(2);
	expect(getBlockConfirmations(blockchain, block2)).toBe(1);

	const tx4 = candsTx(params, blockchain, block2, transactions, bobsk, tomad, 22, 0);
	transactions.push(tx4);

	expect(getTxBlock(blockchain, block2.hash, tx1)).toBe(block1);
	expect(getTxBlock(blockchain, block2.hash, tx3)).toBe(block2);
	expect(getTxBlock(blockchain, block2.hash, cb2)).toBe(block2);
	expect(getTxBlock(blockchain, block2.hash, tx4)).toBe(null);
});

test("tx and block validations", () => {
	const [blockchain, transactions, genesis] = initGen(params);

	const tx1 = candsTx(params, blockchain, genesis, transactions, bobsk, ginad, 11, 0);
	transactions.push(tx1);

	const tx2 = candsTx(params, blockchain, genesis, transactions, bobsk, ginad, 20, 0);
	transactions.push(tx2);

	const cb1 = createCoinbaseTransaction(params, transactions, genesis, [tx1, tx2], ginad);
	transactions.push(cb1);

	const block1 = mineNewBlock(params, blockchain, genesis, [cb1, tx1, tx2]);
	addBlock(blockchain, block1);

	expect(isTransactionValid(params, transactions, tx1).code).toBe(RESULT.VALID);
	expect(isTransactionValid(params, transactions, tx2).code).toBe(RESULT.VALID);
	expect(isCoinbaseTxValid(params, cb1).code).toBe(RESULT.VALID);
	expect(isBlockValidInBlockchain(params, blockchain, genesis, false).code).toBe(RESULT.VALID);
	expect(isBlockValidInBlockchain(params, blockchain, block1, false).code).toBe(RESULT.VALID);

	const tx3 = candsTx(params, blockchain, block1, transactions, ginsk, tomad, 2, 0);
	transactions.push(tx3);

	const cb2 = createCoinbaseTransaction(params, transactions, block1, [tx3], bobad);
	transactions.push(cb2);

	const block2 = mineNewBlock(params, blockchain, block1, [cb2, tx3]);
	addBlock(blockchain, block2);

	expect(isTransactionValid(params, transactions, tx3).code).toBe(RESULT.VALID);
	expect(isCoinbaseTxValid(params, cb2).code).toBe(RESULT.VALID);
	expect(isBlockValidInBlockchain(params, blockchain, genesis, false).code).toBe(RESULT.VALID);
	expect(isBlockValidInBlockchain(params, blockchain, block1, false).code).toBe(RESULT.VALID);
	expect(isBlockValidInBlockchain(params, blockchain, block2, false).code).toBe(RESULT.VALID);

	const tx4 = candsTx(params, blockchain, block2, transactions, bobsk, tomad, 22, 0);
	transactions.push(tx4);

	expect(isTransactionValid(params, transactions, tx4).code).toBe(RESULT.VALID);
});
