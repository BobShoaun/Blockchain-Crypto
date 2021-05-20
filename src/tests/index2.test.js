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

test("public key and address generation", () => {
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

test("Genesis", () => {
	resetCache();
	const genesis = mineGenesisBlock(params, bobad);
	const blockchain = createBlockchain([genesis]);
	expect(isBlockchainValid(params, blockchain, genesis)).toBe(true);
});

test("Simplest case", () => {
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
	const block1 = evaluate(mineNewBlock(params, blockchain, genesis, [tx1], bobad));
	addBlockToBlockchain(blockchain, block1);
	expect(isBlockchainValid(params, blockchain, block1)).toBe(true);
});
