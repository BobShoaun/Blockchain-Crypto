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
	return (transactionSets[headBlock.hash] = transactionSet);
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

// amount and fee all in smallest denominations
function createAndSignTransaction(
	params,
	utxos,
	senderSK,
	senderPK,
	senderAdd,
	recipientAdd,
	amount,
	fee
) {
	const inputs = [];
	let totalInputAmt = 0;

	for (const utxo of utxos) {
		inputs.push({
			txHash: utxo.txHash,
			outIndex: utxo.outIndex,
			publicKey: senderPK,
			signature: null,
		});
		totalInputAmt += utxo.amount;
	}

	const payment = {
		address: recipientAdd,
		amount,
	};
	const outputs = [payment];

	const changeAmount = totalInputAmt - amount - fee;
	if (changeAmount > 0) {
		const change = {
			address: senderAdd,
			amount: changeAmount,
		};
		outputs.push(change);
	}

	const transaction = {
		timestamp: Date.now(),
		version: params.version,
		inputs,
		outputs,
	};

	signTransaction(transaction, senderSK);
	transaction.hash = calculateTransactionHash(transaction); // txHash used for referencing
	return transaction;
}

function calculateTransactionHash(transaction) {
	return SHA256(
		transaction.timestamp +
			transaction.version +
			JSON.stringify(transaction.inputs) +
			JSON.stringify(transaction.outputs)
	).toString();
}

function calculateTransactionPreImage(transaction) {
	const txCopy = JSON.parse(JSON.stringify(transaction));
	for (const input of txCopy.inputs) input.signature = input.publicKey; // placeholder for generating pre-image
	return calculateTransactionHash(txCopy);
}

// for now theres only support for signing txs for one sender.
function signTransaction(transaction, senderSK) {
	const preImage = calculateTransactionPreImage(transaction); // preimage hash
	const keyPair = ec.keyFromPrivate(base58ToHex(senderSK), "hex");
	const signature = keyPair.sign(preImage, "hex").toDER("hex");
	for (const input of transaction.inputs) input.signature = signature;
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
	resetCache,
	calculateMempool,
	calculateTransactionHash,
	calculateUTXOSet,
	calculateMempoolUTXOSet,
	createAndSignTransaction,
	calculateTransactionPreImage,
	calculateTransactionSet,
	updateUTXOSet,
	findUTXOs,
};
