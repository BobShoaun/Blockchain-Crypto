const { getPreviousBlock } = require("./chain");

let utxoSets = {}; // cached UTXOsets for each block

function resetUtxoSets() {
	utxoSets = {};
}

function calculateUTXOSet(blockchain, headBlock) {
	if (headBlock.hash in utxoSets) return utxoSets[headBlock.hash];

	const utxoSet = headBlock.previousHash
		? [...calculateUTXOSet(blockchain, getPreviousBlock(blockchain, headBlock))]
		: [];

	for (const transaction of headBlock.transactions) updateUTXOSet(utxoSet, transaction);

	return (utxoSets[headBlock.hash] = utxoSet);
}

function calculateMempoolUTXOSet(blockchain, headBlock, transactions) {
	const utxoSet = [...calculateUTXOSet(blockchain, headBlock)];
	const mempool = calculateMempool(blockchain, headBlock, transactions);
	for (const transaction of mempool) updateUTXOSet(utxoSet, transaction);
	return utxoSet;
}

function findUTXOs(blockchain, headBlock, transactions, address, amount) {
	const utxoSet = calculateMempoolUTXOSet(blockchain, headBlock, transactions);

	// pick utxos from front to back.
	let totalAmount = 0;
	const utxos = [];
	for (const utxo of utxoSet) {
		if (totalAmount >= amount) break;
		if (utxo.address !== address) continue;
		totalAmount += utxo.amount;
		utxos.push(utxo);
	}

	return utxos;
}

function updateUTXOSet(utxoSet, transaction) {
	for (const input of transaction.inputs) {
		// referencing same tx with same output
		const i = utxoSet.findIndex(
			utxo => utxo.txHash === input.txHash && utxo.outIndex === input.outIndex
		);
		// utxo removed because it is now a spent output.
		utxoSet.splice(i, 1);
		// only remove one as there may be duplicates (rare)
	}

	transaction.outputs.forEach((output, index) =>
		utxoSet.push({
			txHash: transaction.hash,
			outIndex: index,
			address: output.address,
			amount: output.amount,
		})
	);
}

module.exports = {
	resetUtxoSets,
	calculateUTXOSet,
	calculateMempoolUTXOSet,
	updateUTXOSet,
	findUTXOs,
};

const { calculateMempool } = require("./transaction");
