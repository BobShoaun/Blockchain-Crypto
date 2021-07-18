const { getPreviousBlock } = require("./chain");
const { calculateBlockReward } = require("./mine");
const { calculateUTXOSet, updateUTXOSet, findTXO } = require("./utxo");
const { base58ToHex } = require("./key.js");

const SHA256 = require("crypto-js/sha256");
const EC = require("elliptic").ec;
const ec = new EC("secp256k1");

let transactionSets = {}; // cached txSet for each block

function resetTransactionSets() {
	transactionSets = {};
}

// check if tx is coinbase tx without any context, may wrongly return true for invalid tx with no inputs.
function isCoinbase(transaction) {
	return transaction.inputs.length === 0 && transaction.outputs.length === 1;
}

function calculateMempool(blockchain, headBlock, transactions) {
	const transactionSet = calculateTransactionSet(blockchain, headBlock);
	return transactions.filter(
		tx => !transactionSet.some(txSet => txSet.hash === tx.hash) && !isCoinbase(tx)
	);
}

function calculateTransactionSet(blockchain, headBlock) {
	if (headBlock.hash in transactionSets) return transactionSets[headBlock.hash];

	const prevTxSet = headBlock.previousHash
		? calculateTransactionSet(blockchain, getPreviousBlock(blockchain, headBlock))
		: [];

	const transactionSet = [...prevTxSet, ...headBlock.transactions];
	return (transactionSets[headBlock.hash] = transactionSet);
}

function createTransaction(params, inputs, outputs) {
	return {
		timestamp: Date.now(),
		version: params.version,
		inputs,
		outputs,
	};
}

function calculateTransactionHash(transaction) {
	return SHA256(
		transaction.timestamp +
			transaction.version +
			JSON.stringify(
				transaction.inputs.map(input => ({
					txHash: input.txHash,
					outIndex: input.outIndex,
					publicKey: input.publicKey,
					signature: input.signature,
				}))
			) +
			JSON.stringify(
				transaction.outputs.map(output => ({
					address: output.address,
					amount: output.amount,
				}))
			)
	).toString();
}

function calculateTransactionPreImage(transaction) {
	const txCopy = JSON.parse(JSON.stringify(transaction)); // deep copy
	for (const input of txCopy.inputs) input.signature = input.publicKey; // placeholder for generating pre-image
	return calculateTransactionHash(txCopy);
}

function signTransaction(transaction, privateKey) {
	const preImage = calculateTransactionPreImage(transaction); // preimage hash
	const keyPair = ec.keyFromPrivate(base58ToHex(privateKey), "hex");
	return keyPair.sign(preImage, "hex").toDER("hex");
}

function signTransactionHex(transaction, secretKey) {
	const preImage = calculateTransactionPreImage(transaction); // preimage hash
	const keyPair = ec.keyFromPrivate(secretKey, "hex");
	return keyPair.sign(preImage, "hex").toDER("hex");
}

function getTxBlock(blockchain, headBlockHash, transaction) {
	let prevBlockHash = headBlockHash;
	for (let i = blockchain.length - 1; i >= 0; i--) {
		if (blockchain[i].hash !== prevBlockHash) continue;
		if (blockchain[i].transactions.some(tx => tx.hash === transaction.hash)) return blockchain[i];
		prevBlockHash = blockchain[i].previousHash;
	}
	// tx does not exist in chain.
	return null;
}

function getAddressTxs(blockchain, headBlock, address) {
	const transactions = calculateTransactionSet(blockchain, headBlock);
	const receivedTxs = [];
	const sentTxs = [];
	for (const transaction of transactions) {
		if (transaction.outputs.some(output => output.address === address))
			receivedTxs.push(transaction);
	}
	for (const transaction of transactions) {
		if (
			transaction.inputs.some(input =>
				receivedTxs.some(
					tx => input.txHash === tx.hash && tx.outputs[input.outIndex].address === address
				)
			)
		)
			sentTxs.push(transaction);
	}
	// really doesnt make sense to split into received and sent because they are not mutually exclusive..
	// but for ui sake its good, maybe return all txs too.
	return [receivedTxs, sentTxs];
}

function getTransactionFees(transactions, transaction) {
	let fees = 0;
	for (const input of transaction.inputs) {
		const TXO = findTXO(input, transactions);
		fees += TXO.amount;
	}
	for (const output of transaction.outputs) fees -= output.amount;
	return fees;
}

module.exports = {
	resetTransactionSets,
	calculateMempool,
	calculateTransactionHash,
	calculateTransactionPreImage,
	calculateTransactionSet,
	signTransaction,
	getTxBlock,
	getAddressTxs,
	createTransaction,
	getTransactionFees,
	signTransactionHex,
};
