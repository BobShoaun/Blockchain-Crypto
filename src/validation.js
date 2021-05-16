const {
	calculateUTXOSet,
	calculateUTXOHash,
	calculateTransactionHash,
} = require("./transaction.js");
const { calculateBlockHash, calculateBlockReward } = require("./mine.js");
const { initialHashTarget } = require("./parameter.js");

const { base58ToHex } = require("./key.js");

const EC = require("elliptic").ec;
const ec = new EC("secp256k1");

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

function isCoinbaseTransaction(transaction) {}

function isBlockchainValid(blockchain, headBlock) {
	let currBlockHash = headBlock.hash;
	let prevBlock = headBlock;
	for (let i = blockchain.length - 1; i >= 0; i--) {
		const block = blockchain[i];
		if (block.hash !== currBlockHash) continue;

		if (!isBlockValid(block)) return false; // block itself valid

		if (block.height === 0) return true; // reached genesis

		if (prevBlock !== headBlock && prevBlock.height !== block.height + 1) return false; // previous block with unmatching heights

		prevBlock = block;
		currBlockHash = block.previousHash;
	}
	return false;
}

// is the block valid in the context of the entire blockchain?
function isBlockValidInBlockchain(blockchain, block) {
	if (block.difficulty !== calculateBlockDifficulty(blockchain, block)) return false;
	return isBlockValid(block);
}

function isBlockValid(block) {
	if (block.height < 0) return false; // height valid
	if (block.hash !== calculateBlockHash(block)) return false; // block hash valid

	const hashTarget = initialHashTarget / BigInt(Math.trunc(block.difficulty));
	const blockHash = BigInt("0x" + block.hash);
	if (blockHash > hashTarget) return false; // block hash fits difficulty

	const totalInputAmount = block.transactions.reduce(
		(total, tx) => total + tx.inputs.reduce((total, input) => total + input.amount, 0),
		0
	);

	const totalOutputAmount = block.transactions.reduce(
		(total, tx) => total + tx.outputs.reduce((total, output) => total + output.amount, 0),
		0
	);

	const fee = totalInputAmount - totalOutputAmount;

	let coinbaseFound = false;
	let feeFound = false;
	let miner = null;

	for (const transaction of block.transactions) {
		if (transaction.inputs.length === 0) {
			// coinbase or fee
			if (transaction.outputs.length !== 1) return false; // wrong length of output
			if (!coinbaseFound) {
				if (transaction.outputs[0].amount !== calculateBlockReward(block.height)) return false; // invalid reward
				miner = transaction.outputs[0].address;
				if (!miner) return false;
				coinbaseFound = true;
			} else if (!feeFound) {
				if (transaction.outputs[0].amount !== fee) return false; // invalid fee
				if (transaction.outputs[0].miner !== miner) return false; // fee reward not same as miner
				feeFound = true;
			} else return false; // more than one fee or coinbase
			continue;
		}
		if (!isTransactionValid(transaction)) return false;
	}
	return true;
}

function isTransactionValid(transaction) {
	if (!transaction.inputs || !transaction.outputs) return false;

	if (transaction.type === "coinbase") {
		if (transaction.inputs.length > 0) return false;
		if (transaction.outputs.length !== 1) return false; // wrong length of output
		// if (transaction.outputs[0].amount !== calculateBlockReward(block.height)) return false; // invalid reward
	} else if (transaction.type === "fee") {
		if (transaction.inputs.length > 0) return false;
		if (transaction.outputs.length !== 1) return false; // wrong length of output
	}

	if (!transaction.inputs.length || !transaction.outputs.length) return false;

	const sender = transaction.inputs[0].address;
	let totalInputAmount = 0;
	let totalOutputAmount = 0;

	for (const input of transaction.inputs) {
		if (sender !== input.address) return false;
		if (input.hash !== calculateUTXOHash(input)) return false;
		totalInputAmount += input.amount;
	}

	for (const output of transaction.outputs) {
		if (output.hash !== calculateUTXOHash(output)) return false;
		totalOutputAmount += output.amount;
	}

	if (totalInputAmount < totalOutputAmount) return false;

	if (!transaction.signature) return false; // signature is present

	if (transaction.hash !== calculateTransactionHash(transaction)) return false; // hash is valid

	try {
		const key = ec.keyFromPublic(base58ToHex(sender), "hex");
		const signature = base58ToHex(transaction.signature);
		return key.verify(transaction.hash, signature); // signature is valid
	} catch {
		return false;
	}
}

module.exports = {
	isProposedBlockValid,
	isBlockchainValid,
	isBlockValidInBlockchain,
	isBlockValid,
	isTransactionValid,
};
