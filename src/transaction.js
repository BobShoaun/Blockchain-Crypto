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
				// utxo removed because it is now a spent output.
				if (utxoSet[i].txHash === input.txHash && utxoSet[i].outIndex === input.outIndex) {
					// referencing same tx with same output
					utxoSet.splice(i, 1);
					break; // only remove one as there may be duplicates (rare)
				}
			}
		}

		for (let i = 0; i < transaction.outputs.length; i++) {
			utxoSet.push({
				txHash: transaction.hash,
				outIndex: i,
				address: transaction.outputs[i].address,
				amount: transaction.outputs[i].amount,
			});
		}
	}

	return (utxoSets[headBlock.hash] = utxoSet);
}

function calculateUTXOHash(utxo) {
	return SHA256(utxo.address + utxo.amount + utxo.timestamp).toString();
}

// amount and fee all in smallest denominations
function createAndSignTransaction(
	params,
	blockchain,
	headBlock,
	senderSK,
	senderPK,
	senderAdd,
	recipientAdd,
	amount,
	fee
) {
	const [utxos, totalAmount] = findUTXOs(blockchain, headBlock, senderAdd, amount + fee);

	const inputs = [];

	for (const utxo of utxos)
		inputs.push({
			txHash: utxo.txHash,
			outIndex: utxo.outIndex,
			publicKey: senderPK,
			signature: null,
		});

	const payment = {
		address: recipientAdd,
		amount,
	};
	const outputs = [payment];

	const changeAmount = totalAmount - amount - fee;
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

function findUTXOs(blockchain, headBlock, address, amount) {
	const utxoSet = calculateUTXOSet(blockchain, headBlock);

	// pick utxos from front to back.
	let totalAmount = 0;
	const utxos = [];
	for (const utxo of utxoSet) {
		if (totalAmount >= amount) break;
		if (utxo.address !== address) continue;
		totalAmount += utxo.amount;
		utxos.push(utxo);
	}

	return [utxos, totalAmount];
}

module.exports = {
	resetCache,
	calculateMempool,
	calculateTransactionHash,
	calculateUTXOSet,
	createAndSignTransaction,
	calculateUTXOHash,
	calculateTransactionPreImage,
	calculateTransactionSet,
};
