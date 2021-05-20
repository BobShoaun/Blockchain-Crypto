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
	initBlockDiff: 1,
	initHashTarg: "0fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
	targBlkTime: 5 * 60, // 5 minutes in seconds
	diffRecalcHeight: 20, // in block height
	minDiffCorrFact: 1 / 4,
	maxDiffCorrFact: 4,
};

const { sk: bobsk, pk: bobpk, address: bobad } = generateKeys(params);
const { sk: tomsk, pk: tompk, address: tomad } = generateKeys(params);
const { sk: ginsk, pk: ginpk, address: ginad } = generateKeys(params);

function candsTx(p, bc, hb, ssk, ad, amt, fee) {
	const { sk, pk, address } = getKeys(p, ssk);
	return createAndSignTransaction(p, bc, hb, sk, pk, address, ad, amt, fee);
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
	resetCache();
	const genesis = mineGenesisBlock(params, bobad);
	const blockchain = createBlockchain([genesis]);
	expect(isBlockchainValid(params, blockchain, genesis)).toBe(true);
});

test("Simplest Case", () => {
	resetCache();
	const genesis = mineGenesisBlock(params, bobad);
	const blockchain = createBlockchain([genesis]);
	const tx1 = candsTx(params, blockchain, genesis, bobsk, tomad, 20, 0);
	const block1 = evaluate(mineNewBlock(params, blockchain, genesis, [tx1], bobad));
	addBlockToBlockchain(blockchain, block1);
	expect(isBlockchainValid(params, blockchain, block1)).toBe(true);
});

test("Mempool Simplest Case", () => {
	resetCache();
	const genesis = mineGenesisBlock(params, bobad);
	const blockchain = createBlockchain([genesis]);
	const tx1 = candsTx(params, blockchain, genesis, bobsk, tomad, 20, 0);
	const block1 = evaluate(
		mineNewBlock(params, blockchain, genesis, calculateMempool(blockchain, genesis, [tx1]), bobad)
	);
	addBlockToBlockchain(blockchain, block1);
	expect(isBlockchainValid(params, blockchain, block1)).toBe(true);
});

test("Multiple Tx per Block", () => {
	resetCache();
	const genesis = mineGenesisBlock(params, bobad);
	const blockchain = createBlockchain([genesis]);
	const tx1 = candsTx(params, blockchain, genesis, bobsk, tomad, 20, 0);
	// const tx2 = candsTx(params, blockchain, genesis, bobsk, ginad, 20, 0);
	const block1 = evaluate(mineNewBlock(params, blockchain, genesis, [tx1], tomad));
	addBlockToBlockchain(blockchain, block1);
	const tx3 = candsTx(params, blockchain, block1, bobsk, ginad, 10, 0);
	const tx4 = candsTx(params, blockchain, block1, tomsk, bobad, 30, 0);
	// const tx5 = candsTx(params, blockchain, block1, ginsk, bobad, 20, 0);
	const block2 = evaluate(mineNewBlock(params, blockchain, block1, [tx3, tx4], bobad));
	addBlockToBlockchain(blockchain, block2);
	// console.log(JSON.stringify(blockchain, null, 2));
	expect(isBlockchainValid(params, blockchain, block2)).toBe(true);
});

test("Overspend within Block", () => {
	resetCache();
	const genesis = mineGenesisBlock(params, bobad);
	const blockchain = createBlockchain([genesis]);
	const tx1 = candsTx(params, blockchain, genesis, bobsk, tomad, 20, 0);
	const tx2 = candsTx(params, blockchain, genesis, bobsk, ginad, 20, 0);
	const tx3 = candsTx(params, blockchain, genesis, bobsk, ginad, 11, 0); // overspend
	const block1 = evaluate(mineNewBlock(params, blockchain, genesis, [tx1, tx2, tx3], bobad));
	addBlockToBlockchain(blockchain, block1);
	expect(() => isBlockchainValid(params, blockchain, block1)).toThrow();
});
