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
} = require("./CryptoClient");

test("should generate correct public key", () => {
	const { sk, pk } = getKeyPair("b0b0");
	expect(sk).toBe("b0b0");
	expect(pk).toBe(
		"04c319cd3653629675324efcd1eff65cd3e43f3453997da3f7ade8b457e5b57c1c3058dcb1f6a10853bb2febad94dbb0e156e909a60c30d118fe43359252ee160c"
	);
});

test("invalid tx", () => {
	const { sk: bobsk, pk: bobpk } = generateKeyPair();
	const { sk: tomsk, pk: tompk } = generateKeyPair();

	const genesis = mineGenesisBlock(tompk);
	const blockchain = createBlockchain([genesis]);

	const tx1 = createAndSignTransaction(blockchain, genesis, bobsk, bobpk, tompk, 20, 0);
	expect(isBlockValid(genesis)).toBe(true);
	expect(isBlockchainValid(blockchain, genesis)).toBe(true);
	expect(isTransactionValid(tx1)).toBe(false);
});

test("mempool working", () => {
	const { sk: bobsk, pk: bobpk } = generateKeyPair();
	const { sk: tomsk, pk: tompk } = generateKeyPair();

	const genesis = mineGenesisBlock(bobpk);
	const blockchain = createBlockchain([genesis]);

	const tx1 = createAndSignTransaction(blockchain, genesis, bobsk, bobpk, tompk, 20, 0);
});

test("blockchain, tx, and blocks valid", () => {
	const { sk: bobsk, pk: bobpk } = generateKeyPair();
	const { sk: tomsk, pk: tompk } = generateKeyPair();
	const { sk: ginsk, pk: ginpk } = generateKeyPair();
	const genesis = mineGenesisBlock(bobpk);
	const blockchain = createBlockchain([genesis]);
	const tx1 = createAndSignTransaction(blockchain, genesis, bobsk, bobpk, tompk, 20, 0);
	const block1 = mineNewBlock(genesis, [tx1], tompk);
	addBlockToBlockchain(blockchain, block1);
	const tx2 = createAndSignTransaction(blockchain, block1, bobsk, bobpk, tompk, 30, 0);
	const tx3 = createAndSignTransaction(blockchain, block1, tomsk, tompk, ginpk, 70, 0);
	const block2 = mineNewBlock(block1, [tx2, tx3], ginpk);
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
