function createBlockchain(blocks) {
	const blockchain = [...blocks];
	blockchain.sort((a, b) => a.height - b.height);
	return blockchain;
}

function addBlockToBlockchain(blockchain, block) {
	let i = blockchain.length - 1;
	for (; i >= 0; i--) {
		if (blockchain[i].height <= block.height) break;
	}
	blockchain.splice(i + 1, 0, block);
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

// get highest and earliest block in the chain
function getHighestValidBlock(blockchain) {
	if (!blockchain.length) return null;
	const maxHeight = blockchain[blockchain.length - 1].height;
	let earliestBlock = blockchain[blockchain.length - 1];
	for (let i = blockchain.length - 1; i >= 0; i--) {
		if (blockchain[i].height !== maxHeight) break;
		if (blockchain[i].timestamp < earliestBlock.timestamp) earliestBlock = blockchain[i];
	}
	return earliestBlock;
}

// returns new blockchain with invalid and unecessasary blocks removed
function pruneBlockchain(blockchain) {}

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
	addBlockToBlockchain,
	calculateBalance,
	getPreviousBlock,
	getHighestValidBlock,
	getBlockConfirmations,
};

const { calculateUTXOSet } = require("./utxo.js");
