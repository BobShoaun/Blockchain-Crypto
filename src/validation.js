const {
	calculateUTXOSet,
	calculateUTXOHash,
	calculateTransactionHash,
	calculateTransactionPreImage,
} = require("./transaction.js");
const { calculateBlockHash, calculateBlockReward, calculateHashTarget } = require("./mine.js");
const { base58ToHex } = require("./key.js");
const { hexToBigInt } = require("./helper");

const SHA256 = require("crypto-js/sha256");

const EC = require("elliptic").ec;
const ec = new EC("secp256k1");

function isAddressValid(params, address) {
	const pkHash = base58ToHex(address);
	const checksum = pkHash.slice(pkHash.length - params.checksumLen);
	const version = pkHash.slice(0, pkHash.length - params.checksumLen);
	const check = SHA256(version).toString();
	return check.slice(0, params.checksumLen) === checksum;
}

// check if transaction set chosen is valid for the block before mining it.
function isProposedBlockValid(blockchain, prevBlock, transactions) {
	const utxoSet = calculateUTXOSet(blockchain, prevBlock);
	for (const utxo of utxoSet) {
	}

	for (const transaction of transactions) {
		for (const input of transaction.inputs) {
			// if (input.hash in )
		}
	}
}

function isBlockchainValid(params, blockchain, headBlock) {
	let currBlockHash = headBlock.hash;
	let prevBlock = headBlock;
	for (let i = blockchain.length - 1; i >= 0; i--) {
		const block = blockchain[i];
		if (block.hash !== currBlockHash) continue;

		if (!isBlockValid(params, block)) return false; // block itself valid

		if (block.height === 0) return true; // reached genesis

		if (prevBlock !== headBlock && prevBlock.height !== block.height + 1) return false; // previous block with unmatching heights

		prevBlock = block;
		currBlockHash = block.previousHash;
	}
	return false;
}

// is the block valid in the context of the entire blockchain?
function isBlockValidInBlockchain(params, blockchain, block) {
	if (block.difficulty !== calculateBlockDifficulty(params, blockchain, block)) return false;
	return isBlockValid(params, block);
}

function isBlockValid(params, block) {
	if (block.height < 0) return false; // height valid
	if (block.hash !== calculateBlockHash(block)) return false; // block hash valid

	const hashTarget = calculateHashTarget(params, block);

	const blockHash = hexToBigInt(block.hash);
	if (blockHash > hashTarget) return false; // block hash fits difficulty

	// const totalInputAmount = block.transactions.reduce(
	// 	(total, tx) => total + tx.inputs.reduce((total, input) => total + input.amount, 0),
	// 	0
	// );

	// const totalOutputAmount = block.transactions.reduce(
	// 	(total, tx) => total + tx.outputs.reduce((total, output) => total + output.amount, 0),
	// 	0
	// );

	// const fee = totalInputAmount + blockReward - totalOutputAmount;
	const blockReward = calculateBlockReward(params, block.height);

	// let miner = null;
	let coinbaseFound = false;

	for (const transaction of block.transactions) {
		if (!isTransactionValid(transaction)) return false;
		if (!transaction.inputs.length) {
			// coinbase
			if (coinbaseFound) return false; // more than one coinbase tx
			// if (transaction.outputs[0].amount !== blockReward) return false; // invalid reward
			// miner = transaction.outputs[0].address; // coinbase always first
			coinbaseFound = true;
		}
	}
	return true;
}

function isTransactionValidInBlockchain(blockchain, headBlock, transaction) {
	// const utxoSet = calculateUTXOSet(blockchain, headBlock);
	// for (const input of transaction.inputs)
	// 	if (!utxoSet.some(utxo => utxo.hash === input.hash)) return false;
	return isTransactionValid(transaction);
}

function isTransactionValid(transaction) {
	if (!transaction.inputs || !transaction.outputs) return false;

	if (transaction.hash !== calculateTransactionHash(transaction)) return false; // hash is valid

	if (!transaction.inputs.length) {
		// potential coinbase tx
		if (transaction.outputs.length !== 1) return false; // wrong length of output
		if (!transaction.outputs[0].address) return false; // no miner
		return true;
	}

	if (!transaction.inputs.length || !transaction.outputs.length) return false;

	// let totalInputAmount = 0;
	// let totalOutputAmount = 0;

	// TODO check for no duplicate utxo
	// for (const input of transaction.inputs) {
	// 	if (sender !== input.address) return false;
	// 	if (input.hash !== calculateUTXOHash(input)) return false;
	// 	totalInputAmount += input.amount;
	// }

	// for (const output of transaction.outputs) {
	// 	if (output.hash !== calculateUTXOHash(output)) return false;
	// 	totalOutputAmount += output.amount;
	// }

	// if (totalInputAmount < totalOutputAmount) return false;

	const senderPK = transaction.inputs[0].publicKey;
	const preImage = calculateTransactionPreImage(transaction);

	for (const input of transaction.inputs) {
		if (input.publicKey !== senderPK) return false; // only one sender allowed (for now)
		if (!input.signature) return false; // signature not present

		try {
			const key = ec.keyFromPublic(base58ToHex(senderPK), "hex");
			if (!key.verify(preImage, input.signature)) return false; // signature not valid
		} catch {
			return false;
		}
	}
	return true;
}

module.exports = {
	isAddressValid,
	isProposedBlockValid,
	isBlockchainValid,
	isBlockValidInBlockchain,
	isBlockValid,
	isTransactionValid,
	isTransactionValidInBlockchain,
};
