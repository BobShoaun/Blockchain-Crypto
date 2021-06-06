const { getPreviousBlock } = require("./chain");
const { calculateBlockReward } = require("./mine");
const { calculateUTXOSet, updateUTXOSet } = require("./utxo");
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

function createCoinbaseTransaction(params, blockchain, headBlock, transactions, miner) {
	const utxoSet = headBlock ? [...calculateUTXOSet(blockchain, headBlock)] : [];

	let totalFee = 0;
	for (const transaction of transactions) {
		for (const input of transaction.inputs) {
			const utxo = utxoSet.find(
				utxo => utxo.txHash === input.txHash && utxo.outIndex === input.outIndex
			);
			totalFee += utxo.amount;
		}
		for (const output of transaction.outputs) totalFee -= output.amount;
		updateUTXOSet(utxoSet, transaction);
	}

	const output = {
		address: miner,
		amount: headBlock
			? calculateBlockReward(params, headBlock.height + 1) + totalFee
			: params.initBlkReward + totalFee,
	};

	const coinbaseTransaction = {
		timestamp: Date.now(),
		version: params.version,
		inputs: [],
		outputs: [output],
	};
	coinbaseTransaction.hash = calculateTransactionHash(coinbaseTransaction);
	return coinbaseTransaction;
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

module.exports = {
	resetTransactionSets,
	calculateMempool,
	calculateTransactionHash,
	createAndSignTransaction,
	calculateTransactionPreImage,
	calculateTransactionSet,
	createCoinbaseTransaction,
	getTxBlock,
	getAddressTxs,
};
