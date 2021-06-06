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
	resetCache,
	isTransactionValidInBlockchain,
	generateKeys,
	getKeys,
	isAddressValid,
} = require("../../index");

const { evaluate } = require("../helper");

const params = {
	name: "Bobcoin",
	symbol: "BBC", // or BCX ?
	coin: 100000000, // amounts are stored as the smallest unit, this is how many of the smallest unit that amounts to 1 coin.
	version: 1,
	addressPre: "06",
	checksumLen: 4,
	initBlkReward: 50, // in coins
	blkRewardHalflife: 10, // in block height
	initBlkDiff: 1,
	initHashTarg: "0fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
	targBlkTime: 5 * 60, // 5 minutes in seconds
	diffRecalcHeight: 20, // in block height
	minDiffCorrFact: 1 / 4,
	maxDiffCorrFact: 4,
};

const { sk: bobsk, pk: bobpk, address: bobad } = generateKeys(params);
const { sk: tomsk, pk: tompk, address: tomad } = generateKeys(params);
const { sk: ginsk, pk: ginpk, address: ginad } = generateKeys(params);

test("should generate correct public key", () => {
	const { sk, pk, address } = getKeys(params, "bob");
	expect(sk).toBe("bob");
	expect(pk).toBe("21mm3w2KGGbya45eJ9DzezFBJYgaZoyQ8mw5pe3dDpwzZ");
	expect(address).toBe("8obdgEpD9kqU8RqAH6j53j9bX2U62VV");
	expect(isAddressValid(params, address)).toBe(true);
	expect(isAddressValid(params, "8obdgEpD9kqU8RqAH6j53j9bX2U62Vv")).toBe(false);

	const { sk: skt, pk: pkt, address: addresst } = getKeys(params, "tom");
	expect(skt).toBe("tom");
	expect(pkt).toBe("27UjWzSoNmqUGAugKEgPdq75J96eZ2UvKGqYuCgAow7CR");
	expect(addresst).toBe("8YcsQ8ANhQYQgZLWMHLW2G7JkKYVbyd");
	expect(isAddressValid(params, addresst)).toBe(true);
});

test("invalid tx: overdraw", () => {
	resetCache();
	const genesis = mineGenesisBlock(params, tomad);
	const blockchain = createBlockchain([genesis]);
	const tx1 = createAndSignTransaction(
		params,
		blockchain,
		genesis,
		bobsk,
		bobpk,
		bobad,
		tomad,
		20,
		0
	);
	const block1 = evaluate(mineNewBlock(params, blockchain, genesis, [tx1], bobad));
	addBlockToBlockchain(blockchain, block1);

	expect(isBlockchainValid(params, blockchain, genesis)).toBe(true);
	expect(isBlockchainValid(params, blockchain, block1)).toBe(false);
	// expect(isBlockValid(params, genesis)).toBe(true);
	// expect(isTransactionValid(tx1)).toBe(false);
});

test("mempool working", () => {
	resetCache();
	const genesis = mineGenesisBlock(params, bobad);
	const blockchain = createBlockchain([genesis]);
	const transactions = [];

	const tx1 = createAndSignTransaction(
		params,
		blockchain,
		genesis,
		bobsk,
		bobpk,
		bobad,
		tomad,
		20,
		0
	);
	transactions.push(tx1);
	const mp1 = calculateMempool(blockchain, genesis, transactions);
	expect(mp1).toEqual([tx1]);

	const block1 = evaluate(mineNewBlock(params, blockchain, genesis, mp1, bobad));

	addBlockToBlockchain(blockchain, block1);

	expect(calculateMempool(blockchain, block1, transactions)).toEqual([]);
	expect(calculateMempool(blockchain, genesis, transactions)).toEqual([tx1]);

	const tx2 = createAndSignTransaction(
		params,
		blockchain,
		block1,
		bobsk,
		bobpk,
		bobad,
		ginad,
		30,
		0
	);
	transactions.push(tx2);

	expect(calculateMempool(blockchain, block1, transactions)).toEqual([tx2]);

	const tx3 = createAndSignTransaction(
		params,
		blockchain,
		block1,
		bobsk,
		bobpk,
		bobad,
		ginad,
		30,
		0
	); // double spend
	transactions.push(tx3);

	// expect(isTransactionValid(tx3)).toBe(true); // has not been added to blockchain so valid by itself
	// expect(isTransactionValidInBlockchain(blockchain, block1, tx3)).toBe(true); // still valid in context of blockchain becuz not mined
	expect(calculateMempool(blockchain, block1, transactions)).toEqual([tx2, tx3]);

	const block2 = evaluate(
		mineNewBlock(
			params,
			blockchain,
			block1,
			calculateMempool(blockchain, block1, transactions),
			tomad
		)
	);
	addBlockToBlockchain(blockchain, block2);

	// expect(isTransactionValidInBlockchain(blockchain, block2, tx3)).toBe(false); // not valid in context of blockchain after mining

	// expect(isBlockValid(params, block2)).toBe(true); // block doesnt know about the entire blockchain, cant get utxo set
	expect(isBlockchainValid(params, blockchain, block2)).toBe(false); // need to fix this
});

test("double spending", () => {
	resetCache();
	const genesis = mineGenesisBlock(params, bobad);
	const blockchain = createBlockchain([genesis]);
	const transactions = [];

	transactions.push(
		createAndSignTransaction(params, blockchain, genesis, bobsk, bobpk, bobad, tomad, 20, 0)
	);
	const block1 = evaluate(
		mineNewBlock(
			params,
			blockchain,
			genesis,
			calculateMempool(blockchain, genesis, transactions),
			bobad
		)
	);
	addBlockToBlockchain(blockchain, block1);

	expect(calculateMempool(blockchain, block1, transactions)).toEqual([]);

	const tx1 = createAndSignTransaction(
		params,
		blockchain,
		block1,
		bobsk,
		bobpk,
		bobad,
		ginad,
		30,
		0
	);
	const tx2 = createAndSignTransaction(
		params,
		blockchain,
		block1,
		tomsk,
		tompk,
		tomad,
		ginad,
		20,
		0
	);
	transactions.push(tx1, tx2);

	expect(calculateMempool(blockchain, block1, transactions)).toEqual([tx1, tx2]);
	const block2 = evaluate(
		mineNewBlock(
			params,
			blockchain,
			block1,
			calculateMempool(blockchain, block1, transactions),
			tomad
		)
	);
	addBlockToBlockchain(blockchain, block2);

	expect(calculateMempool(blockchain, block2, transactions)).toEqual([]);

	expect(calculateBalance(blockchain, block2, bobad)).toBe(50);
	expect(calculateBalance(blockchain, block2, tomad)).toBe(50);
	expect(calculateBalance(blockchain, block2, ginad)).toBe(50);

	expect(isBlockchainValid(params, blockchain, block2)).toBe(true);

	const tx3 = createAndSignTransaction(
		params,
		blockchain,
		block1,
		tomsk,
		tompk,
		tomad,
		ginad,
		60,
		0
	);
	transactions.push(tx3);

	// expect(isTransactionValid(tx3)).toBe(false);
});

test("blockchain, tx, and blocks valid", () => {
	resetCache();
	const genesis = mineGenesisBlock(params, bobad);
	const blockchain = createBlockchain([genesis]);
	const tx1 = createAndSignTransaction(
		params,
		blockchain,
		genesis,
		bobsk,
		bobpk,
		bobad,
		tomad,
		20,
		0
	);
	const block1 = evaluate(mineNewBlock(params, blockchain, genesis, [tx1], tomad));
	addBlockToBlockchain(blockchain, block1);
	const tx2 = createAndSignTransaction(
		params,
		blockchain,
		block1,
		bobsk,
		bobpk,
		bobad,
		tomad,
		30,
		0
	);
	const tx3 = createAndSignTransaction(
		params,
		blockchain,
		block1,
		tomsk,
		tompk,
		tomad,
		ginad,
		70,
		0
	);
	const block2 = evaluate(mineNewBlock(params, blockchain, block1, [tx2, tx3], ginad));
	addBlockToBlockchain(blockchain, block2);
	// expect(isTransactionValid(tx1) && isTransactionValid(tx2) && isTransactionValid(tx3)).toBe(true);
	// expect(isBlockValid(params, genesis)).toBe(true);
	// expect(isBlockValid(params, block1)).toBe(true);
	// expect(isBlockValid(params, block2)).toBe(true);
	expect(isBlockchainValid(params, blockchain, block2)).toBe(true);
	expect(calculateBalance(blockchain, block2, bobad)).toBe(0);
	expect(calculateBalance(blockchain, block2, tomad)).toBe(30);
	expect(calculateBalance(blockchain, block2, ginad)).toBe(120);
});

test("block difficulty recalculation", () => {
	params.diffRecalcHeight = 5;
	const genesis = mineGenesisBlock(params, bobad);
	const blockchain = createBlockchain([genesis]);
	for (let i = 0; i < 4; i++) {
		const block1 = evaluate(
			mineNewBlock(params, blockchain, getHighestValidBlock(blockchain), [], tomad)
		);
		addBlockToBlockchain(blockchain, block1);
		expect(block1.difficulty).toBe(1);
	}

	let block = {};
	for (block of mineNewBlock(params, blockchain, getHighestValidBlock(blockchain), [], tomad));
	addBlockToBlockchain(blockchain, block);
	expect(block.difficulty).not.toBe(1);

	const block2 = evaluate(
		mineNewBlock(params, blockchain, getHighestValidBlock(blockchain), [], tomad)
	);
	expect(block2.difficulty).not.toBe(1);
	expect(isBlockchainValid(params, blockchain, block2)).toBe(true);
});

test("params setting", () => {});
