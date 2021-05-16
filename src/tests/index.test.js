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
} = require("../../index");

const { sk: bobsk, pk: bobpk } = generateKeyPair();
const { sk: tomsk, pk: tompk } = generateKeyPair();
const { sk: ginsk, pk: ginpk } = generateKeyPair();

test("should generate correct public key", () => {
	const { sk, pk } = getKeyPair("bob");
	expect(sk).toBe("bob");
	expect(pk).toBe("21mm3w2KGGbya45eJ9DzezFBJYgaZoyQ8mw5pe3dDpwzZ");
});

test("invalid tx", () => {
	resetCache();
	const genesis = mineGenesisBlock(tompk);
	const blockchain = createBlockchain([genesis]);

	const tx1 = createAndSignTransaction(blockchain, genesis, bobsk, bobpk, tompk, 20, 0);
	expect(isBlockValid(genesis)).toBe(true);
	expect(isBlockchainValid(blockchain, genesis)).toBe(true);
	expect(isTransactionValid(tx1)).toBe(false);
});

test("mempool working", () => {
	resetCache();
	const genesis = mineGenesisBlock(bobpk);
	const blockchain = createBlockchain([genesis]);
	const transactions = [];

	const tx1 = createAndSignTransaction(blockchain, genesis, bobsk, bobpk, tompk, 20, 0);
	transactions.push(tx1);
	const mp1 = calculateMempool(blockchain, genesis, transactions);
	expect(mp1).toEqual([tx1]);

	const block1 = mineNewBlock(blockchain, genesis, mp1, bobpk);
	addBlockToBlockchain(blockchain, block1);

	expect(calculateMempool(blockchain, block1, transactions)).toEqual([]);
	expect(calculateMempool(blockchain, genesis, transactions)).toEqual([tx1]);

	const tx2 = createAndSignTransaction(blockchain, block1, bobsk, bobpk, ginpk, 30, 0);
	transactions.push(tx2);

	expect(calculateMempool(blockchain, block1, transactions)).toEqual([tx2]);

	const tx3 = createAndSignTransaction(blockchain, block1, bobsk, bobpk, ginpk, 30, 0); // double spend
	transactions.push(tx3);

	expect(isTransactionValid(tx3)).toBe(true); // has not been added to blockchain so valid by itself
	expect(calculateMempool(blockchain, block1, transactions)).toEqual([tx2, tx3]);

	const block2 = mineNewBlock(
		blockchain,
		block1,
		calculateMempool(blockchain, block1, transactions),
		tompk
	);
	addBlockToBlockchain(blockchain, block2);

	expect(isBlockValid(block2)).toBe(true); // why
	expect(isBlockchainValid(blockchain, block2)).toBe(true); // why
});

test("double spending", () => {
	resetCache();
	const genesis = mineGenesisBlock(bobpk);
	const blockchain = createBlockchain([genesis]);
	const transactions = [];

	transactions.push(createAndSignTransaction(blockchain, genesis, bobsk, bobpk, tompk, 20, 0));
	const block1 = mineNewBlock(
		blockchain,
		genesis,
		calculateMempool(blockchain, genesis, transactions),
		bobpk
	);
	addBlockToBlockchain(blockchain, block1);

	expect(calculateMempool(blockchain, block1, transactions)).toEqual([]);

	const tx1 = createAndSignTransaction(blockchain, block1, bobsk, bobpk, ginpk, 30, 0);
	const tx2 = createAndSignTransaction(blockchain, block1, tomsk, tompk, ginpk, 20, 0);
	transactions.push(tx1, tx2);

	expect(calculateMempool(blockchain, block1, transactions)).toEqual([tx1, tx2]);
	const block2 = mineNewBlock(
		blockchain,
		block1,
		calculateMempool(blockchain, block1, transactions),
		tompk
	);
	addBlockToBlockchain(blockchain, block2);

	expect(calculateMempool(blockchain, block2, transactions)).toEqual([]);

	expect(calculateBalance(blockchain, block2, bobpk)).toBe(50);
	expect(calculateBalance(blockchain, block2, tompk)).toBe(50);
	expect(calculateBalance(blockchain, block2, ginpk)).toBe(50);

	expect(isBlockchainValid(blockchain, block2)).toBe(true);

	const tx3 = createAndSignTransaction(blockchain, block1, tomsk, tompk, ginpk, 60, 0);
	transactions.push(tx3);

	expect(isTransactionValid(tx3)).toBe(false);
});

test("blockchain, tx, and blocks valid", () => {
	resetCache();
	const genesis = mineGenesisBlock(bobpk);
	const blockchain = createBlockchain([genesis]);
	const tx1 = createAndSignTransaction(blockchain, genesis, bobsk, bobpk, tompk, 20, 0);
	const block1 = mineNewBlock(blockchain, genesis, [tx1], tompk);
	addBlockToBlockchain(blockchain, block1);
	const tx2 = createAndSignTransaction(blockchain, block1, bobsk, bobpk, tompk, 30, 0);
	const tx3 = createAndSignTransaction(blockchain, block1, tomsk, tompk, ginpk, 70, 0);
	const block2 = mineNewBlock(blockchain, block1, [tx2, tx3], ginpk);
	addBlockToBlockchain(blockchain, block2);
	expect(isTransactionValid(tx1) && isTransactionValid(tx2) && isTransactionValid(tx3)).toBe(true);
	expect(isBlockValid(genesis)).toBe(true);
	expect(isBlockValid(block1)).toBe(true);
	expect(isBlockValid(block2)).toBe(true);
	expect(isBlockchainValid(blockchain, block2)).toBe(true);
	expect(calculateBalance(blockchain, block2, bobpk)).toBe(0);
	expect(calculateBalance(blockchain, block2, tompk)).toBe(30);
	expect(calculateBalance(blockchain, block2, ginpk)).toBe(120);
});
