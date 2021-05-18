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
} = require("../../index");

const { evaluate } = require("../helper");

const { sk: bobsk, pk: bobpk } = generateKeyPair();
const { sk: tomsk, pk: tompk } = generateKeyPair();
const { sk: ginsk, pk: ginpk } = generateKeyPair();

const params = {
	name: "Bobcoin",
	symbol: "BBC", // or BCX ?
	coin: 100000000, // amounts are stored as the smallest unit, this is how many of the smallest unit that amounts to 1 coin.
	initBlockReward: 50, // in coins
	blockRewardHalflife: 10, // in block height
	initBlockDiff: 1,
	initHashTarget: BigInt("0x0fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"),
	targetBlockTime: 5 * 60, // 5 minutes in seconds
	diffRecalcHeight: 20, // in block height
	minDiffCorrectionFactor: 1 / 4,
	maxDiffCorrectionFactor: 4,
};

test("should generate correct public key", () => {
	const { sk, pk } = getKeyPair("bob");
	expect(sk).toBe("bob");
	expect(pk).toBe("21mm3w2KGGbya45eJ9DzezFBJYgaZoyQ8mw5pe3dDpwzZ");
});

test("invalid tx", () => {
	resetCache();
	const genesis = mineGenesisBlock(params, tompk);
	const blockchain = createBlockchain([genesis]);
	const tx1 = createAndSignTransaction(blockchain, genesis, bobsk, bobpk, tompk, 20, 0);
	expect(isBlockValid(params, genesis)).toBe(true);
	expect(isBlockchainValid(params, blockchain, genesis)).toBe(true);
	expect(isTransactionValid(tx1)).toBe(false);
});

test("mempool working", () => {
	resetCache();
	const genesis = mineGenesisBlock(params, bobpk);
	const blockchain = createBlockchain([genesis]);
	const transactions = [];

	const tx1 = createAndSignTransaction(blockchain, genesis, bobsk, bobpk, tompk, 20, 0);
	transactions.push(tx1);
	const mp1 = calculateMempool(blockchain, genesis, transactions);
	expect(mp1).toEqual([tx1]);

	const block1 = evaluate(mineNewBlock(params, blockchain, genesis, mp1, bobpk));

	addBlockToBlockchain(blockchain, block1);

	expect(calculateMempool(blockchain, block1, transactions)).toEqual([]);
	expect(calculateMempool(blockchain, genesis, transactions)).toEqual([tx1]);

	const tx2 = createAndSignTransaction(blockchain, block1, bobsk, bobpk, ginpk, 30, 0);
	transactions.push(tx2);

	expect(calculateMempool(blockchain, block1, transactions)).toEqual([tx2]);

	const tx3 = createAndSignTransaction(blockchain, block1, bobsk, bobpk, ginpk, 30, 0); // double spend
	transactions.push(tx3);

	expect(isTransactionValid(tx3)).toBe(true); // has not been added to blockchain so valid by itself
	expect(isTransactionValidInBlockchain(blockchain, block1, tx3)).toBe(true); // still valid in context of blockchain becuz not mined
	expect(calculateMempool(blockchain, block1, transactions)).toEqual([tx2, tx3]);

	const block2 = evaluate(
		mineNewBlock(
			params,
			blockchain,
			block1,
			calculateMempool(blockchain, block1, transactions),
			tompk
		)
	);
	addBlockToBlockchain(blockchain, block2);

	expect(isTransactionValidInBlockchain(blockchain, block2, tx3)).toBe(false); // not valid in context of blockchain after mining

	expect(isBlockValid(params, block2)).toBe(true); // block doesnt know about the entire blockchain, cant get utxo set
	expect(isBlockchainValid(params, blockchain, block2)).toBe(true); // need to fix this
});

test("double spending", () => {
	resetCache();
	const genesis = mineGenesisBlock(params, bobpk);
	const blockchain = createBlockchain([genesis]);
	const transactions = [];

	transactions.push(createAndSignTransaction(blockchain, genesis, bobsk, bobpk, tompk, 20, 0));
	const block1 = evaluate(
		mineNewBlock(
			params,
			blockchain,
			genesis,
			calculateMempool(blockchain, genesis, transactions),
			bobpk
		)
	);
	addBlockToBlockchain(blockchain, block1);

	expect(calculateMempool(blockchain, block1, transactions)).toEqual([]);

	const tx1 = createAndSignTransaction(blockchain, block1, bobsk, bobpk, ginpk, 30, 0);
	const tx2 = createAndSignTransaction(blockchain, block1, tomsk, tompk, ginpk, 20, 0);
	transactions.push(tx1, tx2);

	expect(calculateMempool(blockchain, block1, transactions)).toEqual([tx1, tx2]);
	const block2 = evaluate(
		mineNewBlock(
			params,
			blockchain,
			block1,
			calculateMempool(blockchain, block1, transactions),
			tompk
		)
	);
	addBlockToBlockchain(blockchain, block2);

	expect(calculateMempool(blockchain, block2, transactions)).toEqual([]);

	expect(calculateBalance(blockchain, block2, bobpk)).toBe(50);
	expect(calculateBalance(blockchain, block2, tompk)).toBe(50);
	expect(calculateBalance(blockchain, block2, ginpk)).toBe(50);

	expect(isBlockchainValid(params, blockchain, block2)).toBe(true);

	const tx3 = createAndSignTransaction(blockchain, block1, tomsk, tompk, ginpk, 60, 0);
	transactions.push(tx3);

	expect(isTransactionValid(tx3)).toBe(false);
});

test("blockchain, tx, and blocks valid", () => {
	resetCache();
	const genesis = mineGenesisBlock(params, bobpk);
	const blockchain = createBlockchain([genesis]);
	const tx1 = createAndSignTransaction(blockchain, genesis, bobsk, bobpk, tompk, 20, 0);
	const block1 = evaluate(mineNewBlock(params, blockchain, genesis, [tx1], tompk));
	addBlockToBlockchain(blockchain, block1);
	const tx2 = createAndSignTransaction(blockchain, block1, bobsk, bobpk, tompk, 30, 0);
	const tx3 = createAndSignTransaction(blockchain, block1, tomsk, tompk, ginpk, 70, 0);
	const block2 = evaluate(mineNewBlock(params, blockchain, block1, [tx2, tx3], ginpk));
	addBlockToBlockchain(blockchain, block2);
	expect(isTransactionValid(tx1) && isTransactionValid(tx2) && isTransactionValid(tx3)).toBe(true);
	expect(isBlockValid(params, genesis)).toBe(true);
	expect(isBlockValid(params, block1)).toBe(true);
	expect(isBlockValid(params, block2)).toBe(true);
	expect(isBlockchainValid(params, blockchain, block2)).toBe(true);
	expect(calculateBalance(blockchain, block2, bobpk)).toBe(0);
	expect(calculateBalance(blockchain, block2, tompk)).toBe(30);
	expect(calculateBalance(blockchain, block2, ginpk)).toBe(120);
});

test("block difficulty recalculation", () => {
	params.diffRecalcHeight = 5;
	const genesis = mineGenesisBlock(params, bobpk);
	const blockchain = createBlockchain([genesis]);
	for (let i = 0; i < 4; i++) {
		const block1 = evaluate(
			mineNewBlock(params, blockchain, getHighestValidBlock(blockchain), [], tompk)
		);
		addBlockToBlockchain(blockchain, block1);
		expect(block1.difficulty).toBe(1);
	}

	let block = {};
	for (block of mineNewBlock(params, blockchain, getHighestValidBlock(blockchain), [], tompk));
	addBlockToBlockchain(blockchain, block);
	expect(block.difficulty).not.toBe(1);

	const block2 = evaluate(
		mineNewBlock(params, blockchain, getHighestValidBlock(blockchain), [], tompk)
	);
	expect(block2.difficulty).not.toBe(1);
});

test("params setting", () => {
	let parameters = {
		name: "Bobcoin",
		symbol: "BBX", // or BCX ?
		coin: 100000000, // amounts are stored as the smallest unit, this is how many of the smallest unit that amounts to 1 coin.
		initBlockReward: 50, // in coins
		blockRewardHalflife: 10, // in block height
		initBlockDiff: 1,
		initHashTarget: BigInt("0x00ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"),
		targetBlockTime: 5 * 60, // 5 minutes in seconds
		diffRecalcHeight: 20, // in block height
	};

	// params.setParams(parameters);
	// expect(params.symbol).toBe("BBX");
	// params.setName("bitcoin");
	// expect(params.name).toBe("bitcoin");
});
