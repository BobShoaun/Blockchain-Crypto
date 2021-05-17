const SHA256 = require("crypto-js/sha256");
const { calculateTransactionHash, calculateUTXOHash } = require("./transaction.js");
const { getPreviousBlock } = require("./chain.js");
const { bigintToHex64, evaluate } = require("./helper");
const { params } = require("./parameter.js");

function mineGenesisBlock(miner) {
	const block = {
		height: 0,
		difficulty: params.initBlockDiff,
		transactions: [],
		timestamp: Date.now(),
		nonce: 0,
	};
	return evaluate(mineBlock(block, miner));
}

function mineNewBlock(blockchain, headBlock, transactions, miner, targetCallback) {
	// const utxoSet = calculateUTXOSet(blockchain, headBlock);

	let totalFee = 0;
	for (const transaction of transactions) {
		// for (const input of transaction.inputs) {
		// 	for (const utxo of utxoSet) {
		// 		if (utxo.txHash === input.txHash) {
		// 			totalFee += utxo.amount;
		// 		}
		// 	}
		// }
		for (const input of transaction.inputs) totalFee += input.amount;
		for (const output of transaction.outputs) totalFee -= output.amount;
	}

	if (totalFee > 0) {
		const feeOutput = {
			address: miner,
			amount: totalFee,
			timestamp: Date.now(),
		};
		feeOutput.hash = calculateUTXOHash(feeOutput);
		const feeTransaction = {
			type: "fee",
			inputs: [],
			outputs: [feeOutput],
		};
		feeTransaction.hash = calculateTransactionHash(feeTransaction);
		transactions = [feeTransaction, ...transactions];
		// fee transaction is always at index 1
	}

	const block = {
		height: headBlock.height + 1,
		previousHash: headBlock.hash,
		transactions,
		timestamp: Date.now(),
		nonce: 0,
	};
	block.difficulty = calculateBlockDifficulty(blockchain, block);

	return mineBlock(block, miner, targetCallback);
}

function* mineBlock(block, miner, targetCallback) {
	const coinbaseOutput = {
		address: miner,
		amount: calculateBlockReward(block.height),
		timestamp: Date.now(),
	};
	coinbaseOutput.hash = calculateUTXOHash(coinbaseOutput);

	const coinbaseTransaction = {
		type: "coinbase",
		inputs: [],
		outputs: [coinbaseOutput],
	};
	coinbaseTransaction.hash = calculateTransactionHash(coinbaseTransaction);

	// coinbase tx must be the first transaction
	block.transactions = [coinbaseTransaction, ...block.transactions];

	// divide by multiplying divisor by 1000 then dividing results by 1000
	let hashTarget = params.initHashTarget / BigInt(Math.trunc(block.difficulty * 1000));
	hashTarget *= 1000n;

	targetCallback?.(bigintToHex64(hashTarget));

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

function calculateBlockReward(height) {
	const n = Math.trunc(height / params.blockRewardHalflife);
	if (n == 0) return params.initBlockReward;
	return params.initBlockReward / (2 * n);
}

// get difficulty of current block.
function calculateBlockDifficulty(blockchain, block) {
	const prevBlock = getPreviousBlock(blockchain, block);
	if (block.height % params.diffRecalcHeight !== 0) return prevBlock.difficulty;
	const prevRecalcBlock = getPreviousRecalcBlock(blockchain, block); // prev block diffRecalcHeight away
	const timeDiff = block.timestamp - prevRecalcBlock.timestamp;
	const targetTimeDiff = params.diffRecalcHeight * params.targetBlockTime; // in seconds
	let correctionFactor = targetTimeDiff / timeDiff;
	correctionFactor = Math.min(correctionFactor, params.maxDiffCorrectionFactor); // clamp correctionfactor
	correctionFactor = Math.max(correctionFactor, params.minDiffCorrectionFactor);
	return prevBlock.difficulty * correctionFactor; // new difficulty
}

// precondition: block must be high enough to have previous recalc block.
function getPreviousRecalcBlock(blockchain, block) {
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
};
