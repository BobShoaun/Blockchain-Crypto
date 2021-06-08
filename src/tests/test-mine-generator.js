const {
	mineGenesisBlock,
	mineBlock,
	evaluate,
	createBlockchain,
	createOutput,
	createTransaction,
	calculateTransactionHash,
	addBlock,
} = require("../../index");

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
	initHashTarg: "00000fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
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

const transactions = [];
const blockchain = createBlockchain([]);
const output = createOutput("hello", params.initBlkReward);
const coinbase = createTransaction(params, [], [output]);
coinbase.hash = calculateTransactionHash(coinbase);
transactions.push(coinbase);
console.log("first");
const genesis = mineGenesisBlock(params, transactions);
console.log("second");
addBlock(blockchain, genesis);
console.log(JSON.stringify(blockchain, null, 2));
