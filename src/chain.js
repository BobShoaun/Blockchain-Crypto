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

function getHighestValidBlock(blockchain) {
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

module.exports = {
	createBlockchain,
	addBlockToBlockchain,
	calculateBalance,
	getPreviousBlock,
	getHighestValidBlock,
};

const { calculateUTXOSet } = require("./transaction.js");
