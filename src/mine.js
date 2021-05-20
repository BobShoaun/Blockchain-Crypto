const SHA256 = require("crypto-js/sha256");
const { calculateTransactionHash, calculateUTXOSet } = require("./transaction.js");
const { getPreviousBlock } = require("./chain.js");
const { bigIntToHex64, hexToBigInt, evaluate } = require("./helper");

function mineGenesisBlock(params, miner) {
	const block = {
		height: 0,
		previousHash: null,
		difficulty: params.initBlockDiff,
		transactions: [],
		timestamp: Date.now(),
		nonce: 0,
	};
	return evaluate(mineBlock(params, [], block, block, miner));
}

function mineNewBlock(params, blockchain, headBlock, transactions, miner, targetCallback) {
	const block = {
		height: headBlock.height + 1,
		previousHash: headBlock.hash,
		transactions,
		timestamp: Date.now(),
		nonce: 0,
	};
	block.difficulty = calculateBlockDifficulty(params, blockchain, block);
	return mineBlock(params, blockchain, headBlock, block, miner, targetCallback);
}

function* mineBlock(params, blockchain, headBlock, block, miner, targetCallback) {
	const utxoSet = calculateUTXOSet(blockchain, headBlock);

	let totalFee = 0;
	for (const transaction of block.transactions) {
		for (const input of transaction.inputs)
			for (const utxo of utxoSet)
				if (utxo.txHash === input.txHash && utxo.outIndex === input.outIndex)
					totalFee += utxo.amount;
		for (const output of transaction.outputs) totalFee -= output.amount;
	}

	const coinbaseOutput = {
		address: miner,
		amount: calculateBlockReward(params, block.height) + totalFee,
	};

	const coinbaseTransaction = {
		timestamp: Date.now(),
		version: params.version,
		inputs: [],
		outputs: [coinbaseOutput],
	};
	coinbaseTransaction.hash = calculateTransactionHash(coinbaseTransaction);

	// coinbase tx must be the first transaction
	block.transactions = [coinbaseTransaction, ...block.transactions];

	const hashTarget = calculateHashTarget(params, block);
	targetCallback?.(bigIntToHex64(hashTarget));

	while (true) {
		block.hash = calculateBlockHash(block);
		const currentHash = BigInt("0x" + block.hash);
		if (currentHash <= hashTarget)
			// mining successful
			return yield block;

		block.nonce++;
		yield block;
	}
}

function calculateBlockHash(block) {
	return SHA256(
		block.height +
			block.difficulty +
			JSON.stringify(block.transactions) +
			block.timestamp +
			block.previousHash +
			block.nonce
	).toString();
}

function calculateBlockReward(params, height) {
	const n = Math.trunc(height / params.blkRewardHalflife);
	if (n == 0) return params.initBlkReward;
	return params.initBlkReward / (2 * n);
}

// get difficulty of current block.
function calculateBlockDifficulty(params, blockchain, block) {
	const prevBlock = getPreviousBlock(blockchain, block);
	if (block.height % params.diffRecalcHeight !== 0) return prevBlock.difficulty;
	const prevRecalcBlock = getPreviousRecalcBlock(params, blockchain, block); // prev block diffRecalcHeight away
	const timeDiff = block.timestamp - prevRecalcBlock.timestamp;
	const targetTimeDiff = params.diffRecalcHeight * params.targBlkTime; // in seconds
	let correctionFactor = targetTimeDiff / timeDiff;
	correctionFactor = Math.min(correctionFactor, params.maxDiffCorrFact); // clamp correctionfactor
	correctionFactor = Math.max(correctionFactor, params.minDiffCorrFact);
	return prevBlock.difficulty * correctionFactor; // new difficulty
}

function calculateHashTarget(params, block) {
	// divide by multiplying divisor by 1000 then dividing results by 1000
	const initHashTarget = hexToBigInt(params.initHashTarg);
	let hashTarget = initHashTarget / BigInt(Math.trunc(block.difficulty * 1000));
	hashTarget *= 1000n;
	if (hashTarget > initHashTarget)
		// clamp hash target if too big
		hashTarget = initHashTarget;
	return hashTarget;
}

// precondition: block must be high enough to have previous recalc block.
function getPreviousRecalcBlock(params, blockchain, block) {
	let prevHash = block.previousHash;
	let prevCount = 0;
	for (let i = blockchain.length - 1; i >= 0; i--) {
		if (blockchain[i].hash !== prevHash) continue;
		prevHash = blockchain[i].previousHash;
		prevCount++;
		if (prevCount >= params.diffRecalcHeight) return blockchain[i];
	}
	throw Error("no prev recalc block found");
}

module.exports = {
	mineGenesisBlock,
	mineNewBlock,
	calculateBlockHash,
	getPreviousRecalcBlock,
	calculateBlockReward,
	calculateBlockDifficulty,
	calculateHashTarget,
};
