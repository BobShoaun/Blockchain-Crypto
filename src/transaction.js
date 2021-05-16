const { getPreviousBlock } = require("./chain.js");
const { base58ToHex, hexToBase58 } = require("./key.js");

const SHA256 = require("crypto-js/sha256");
const EC = require("elliptic").ec;
const ec = new EC("secp256k1");

let utxoSets = {}; // cached UTXOsets for each block
let transactionSets = {}; // cached txSet for each block

function resetCache() {
	utxoSets = {};
	transactionSets = {};
}

function calculateMempool(blockchain, headBlock, transactions) {
	const transactionSet = calculateTransactionSet(blockchain, headBlock);
	return transactions.filter(tx => !transactionSet.some(txSet => txSet.hash === tx.hash));
}

function calculateTransactionSet(blockchain, headBlock) {
	if (headBlock.hash in transactionSets) return transactionSets[headBlock.hash];

	const prevTxSet = headBlock.previousHash
		? calculateTransactionSet(blockchain, getPreviousBlock(blockchain, headBlock))
		: [];

	const transactionSet = [...prevTxSet, ...headBlock.transactions];

	transactionSets[headBlock.hash] = transactionSet;
	return transactionSet;
}

function calculateUTXOSet(blockchain, headBlock) {
	if (headBlock.hash in utxoSets) return utxoSets[headBlock.hash];

	const prevUTXOSet = headBlock.previousHash
		? calculateUTXOSet(blockchain, getPreviousBlock(blockchain, headBlock))
		: [];
	const utxoSet = [...prevUTXOSet];

	for (const transaction of headBlock.transactions) {
		for (const input of transaction.inputs) {
			for (let i = 0; i < utxoSet.length; i++) {
				// if (utxoSet[i].txHash === input.txHash && utxoSet[i].outIndex === input.outIndex) {
				// 	// referencing same tx with same output
				// 	utxoSet.splice(i, 1);
				// 	break; // only remove one as there may be duplicates (rare)
				// }
				if (utxoSet[i].hash === input.hash) {
					utxoSet.splice(i, 1);
					break; // only remove one as there may be duplicates (rare)
				}
			}
		}

		for (const output of transaction.outputs) utxoSet.push(output);

		// for (let i = 0; i < transaction.outputs.length; i++) {
		// 	utxoSet.push({
		// 		txHash: transaction.hash,
		// 		outIndex: i,
		// 		address: transaction.outputs[i].address,
		// 		amount: transaction.outputs[i].amount,
		// 	});
		// }
	}

	utxoSets[headBlock.hash] = utxoSet;
	return utxoSet;
}

function calculateUTXOHash(utxo) {
	return SHA256(utxo.address + utxo.amount + utxo.timestamp).toString();
}

function createAndSignTransaction(blockchain, headBlock, senderSK, sender, recipient, amount, fee) {
	const utxoSet = calculateUTXOSet(blockchain, headBlock);

	// pick utxos from front to back.
	let utxoAmount = 0;
	const inputs = [];
	for (const utxo of utxoSet) {
		if (utxoAmount >= amount) break;
		if (utxo.address !== sender) continue;
		utxoAmount += utxo.amount;
		// inputs.push({
		// 	txHash: utxo.txHash,
		// 	outIndex: utxo.outIndex,
		// });
		inputs.push(utxo);
	}

	const payment = {
		address: recipient,
		amount,
		timestamp: Date.now(),
	};
	payment.hash = calculateUTXOHash(payment);

	const outputs = [payment];

	const changeAmount = utxoAmount - amount - fee;
	if (changeAmount > 0) {
		const change = {
			address: sender,
			amount: changeAmount,
			timestamp: Date.now(),
		};
		change.hash = calculateUTXOHash(change);
		outputs.push(change);
	}

	const transaction = {
		inputs,
		outputs,
	};
	transaction.hash = calculateTransactionHash(transaction);
	const keyPair = ec.keyFromPrivate(base58ToHex(senderSK), "hex");
	const signature = keyPair.sign(transaction.hash, "hex").toDER("hex");
	transaction.signature = hexToBase58(signature);
	return transaction;
}

function calculateTransactionHash(transaction) {
	return SHA256(
		JSON.stringify(transaction.inputs) + JSON.stringify(transaction.outputs) + transaction.type
	).toString();
}

module.exports = {
	resetCache,
	calculateMempool,
	calculateTransactionHash,
	calculateUTXOSet,
	createAndSignTransaction,
	calculateUTXOHash,
};
