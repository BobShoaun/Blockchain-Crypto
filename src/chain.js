function createBlockchain(blocks) {
	const blockchain = [...blocks];
	blockchain.sort((a, b) => a.height - b.height || a.timestamp - b.timestamp);
	return blockchain;
}

// blocks are ordered by increasing height and timestamp.
function addBlock(blockchain, block) {
	for (let i = blockchain.length - 1; i >= 0; i--) {
		if (block.height < blockchain[i].height) continue;
		if (block.height > blockchain[i].height) {
			blockchain.splice(i + 1, 0, block);
			return;
		}

		if (block.timestamp < blockchain[i].timestamp) continue;
		blockchain.splice(i + 1, 0, block);
		return;
	}
	// insert at the very front
	blockchain.unshift(block);
}

function calculateBalance(blockchain, headBlock, address) {
	let utxoSet = calculateUTXOSet(blockchain, headBlock);
	utxoSet = utxoSet.filter(utxo => utxo.address === address);
	return utxoSet.reduce((prev, curr) => prev + curr.amount, 0);
}

function getPreviousBlock(blockchain, block) {
	for (let i = blockchain.length - 1; i >= 0; i--)
		if (blockchain[i].hash === block.previousHash) return blockchain[i];
	throw Error("no prev block found in blockchain");
}

// get highest and earliest valid block in the chain, aka best chain
function getHighestValidBlock(params, blockchain) {
	if (!blockchain.length) return null;
	const maxHeight = blockchain[blockchain.length - 1].height;
	for (let height = maxHeight; height >= 0; height--) {
		const highestBlocks = blockchain.filter(block => block.height === height);
		for (const block of highestBlocks)
			if (isBlockchainValid(params, blockchain, block).code === RESULT.VALID) return block;
	}
	// no blocks are valid.. very bad
	return null;
}

// returns new blockchain with invalid and unecessasary blocks removed
function pruneBlockchain(blockchain, headBlock, depth) {}

function getBlockConfirmations(blockchain, block) {
	let confirmations = 0;
	let currHash = block.hash;
	for (const blk of blockchain) {
		if (blk.hash === currHash) confirmations++;
		if (blk.previousHash === currHash) {
			currHash = blk.hash;
			confirmations++;
		}
	}
	return confirmations;
}

module.exports = {
	createBlockchain,
	addBlock,
	calculateBalance,
	getPreviousBlock,
	getHighestValidBlock,
	getBlockConfirmations,
};

const { calculateUTXOSet } = require("./utxo.js");
const { isBlockchainValid } = require("./validation");
const { RESULT } = require("./validation-codes");
