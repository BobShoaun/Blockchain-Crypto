const SHA256 = require("crypto-js/sha256");
const { getPreviousBlock } = require("./chain.js");
const { hexToBigInt, evaluate } = require("./helper");

function mineGenesisBlock(params, transactions) {
	const txHashes = transactions.map(tx => tx.hash);
	const block = {
		height: 0,
		previousHash: null,
		transactions,
		timestamp: Date.now(),
		version: params.version,
		difficulty: params.initBlkDiff,
		merkleRoot: calculateMerkleRoot(txHashes),
		nonce: 0,
	};
	const target = calculateHashTarget(params, block);
	return evaluate(mineBlock(block, target));
}

function createBlock(params, blockchain, headBlock, transactions) {
	const block = {
		height: headBlock.height + 1,
		previousHash: headBlock.hash,
		transactions,
		timestamp: Date.now(),
		version: params.version,
		merkleRoot: calculateMerkleRoot(transactions.map(tx => tx.hash)),
		nonce: 0,
	};
	block.difficulty = calculateBlockDifficulty(params, blockchain, block);
	return block;
}

function* mineBlock(block, target) {
	while (true) {
		block.hash = calculateBlockHash(block);
		const currentHash = BigInt("0x" + block.hash);
		if (currentHash <= target)
			// mining successful
			return yield block;
		block.nonce++;
		yield block;
	}
}

function calculateBlockHash(block) {
	return SHA256(
		block.height +
			block.previousHash +
			block.merkleRoot +
			block.timestamp +
			block.version +
			block.difficulty +
			block.nonce
	).toString();
}

// function mutates array
function calculateMerkleRoot(hashes) {
	if (!hashes) throw Error("invalid hashes array when calculating merkle root");

	if (hashes.length % 2 === 1)
		// odd number of hashes
		hashes.push(hashes[hashes.length - 1]);

	const parentHashes = [];
	for (let i = 0; i < hashes.length; i += 2) {
		const left = hashes[i];
		const right = hashes[i + 1];
		const hash = SHA256(left + right).toString();
		parentHashes.push(hash);
	}

	if (parentHashes.length === 1) return parentHashes[0];

	return calculateMerkleRoot(parentHashes);
}

function calculateBlockReward(params, height) {
	const n = Math.trunc(height / params.blkRewardHalflife);
	return Math.trunc(params.initBlkReward / 2 ** n); // cant be decimal, truncated
}

// get difficulty of current block.
function calculateBlockDifficulty(params, blockchain, block) {
	if (block.height === 0) return params.initBlkDiff; // genesis
	const prevBlock = getPreviousBlock(blockchain, block);
	if (block.height % params.diffRecalcHeight !== 0) return prevBlock.difficulty;
	const prevRecalcBlock = getPreviousRecalcBlock(params, blockchain, block); // prev block diffRecalcHeight away
	const timeDiff = block.timestamp - prevRecalcBlock.timestamp;
	const targetTimeDiff = params.diffRecalcHeight * params.targBlkTime; // in seconds
	let correctionFactor = targetTimeDiff / timeDiff;
	correctionFactor = Math.min(correctionFactor, params.maxDiffCorrFact); // clamp correctionfactor
	correctionFactor = Math.max(correctionFactor, params.minDiffCorrFact);
	return Math.max(prevBlock.difficulty * correctionFactor, params.initBlkDiff); // new difficulty
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
	createBlock,
	calculateBlockHash,
	getPreviousRecalcBlock,
	calculateBlockReward,
	calculateBlockDifficulty,
	calculateHashTarget,
	calculateMerkleRoot,
	mineBlock,
};
