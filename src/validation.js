const {
	calculateUTXOSet,
	calculateTransactionSet,
	calculateTransactionHash,
	calculateTransactionPreImage,
} = require("./transaction.js");
const {
	calculateBlockHash,
	calculateBlockReward,
	calculateHashTarget,
	calculateBlockDifficulty,
} = require("./mine.js");
const { getPreviousBlock } = require("./chain");
const { base58ToHex, getAddressFromPKHex } = require("./key.js");
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

function isMempoolTransactionValid(params, blockchain, headBlock, transaction) {}

function isBlockchainValid(params, blockchain, headBlock) {
	let currBlockHash = headBlock.hash;
	let prevBlock = headBlock;
	for (let i = blockchain.length - 1; i >= 0; i--) {
		const block = blockchain[i];
		if (block.hash !== currBlockHash) continue;

		// ---- block check ----
		if (block.height < 0) return false; // height invalid
		if (!block.transactions.length) return false; // must have at least 1 tx (coinbase)
		if (block.hash !== calculateBlockHash(block)) return false; // block hash invalid
		if (block.difficulty !== calculateBlockDifficulty(params, blockchain, block)) return false;

		const hashTarget = calculateHashTarget(params, block);
		const blockHash = hexToBigInt(block.hash);
		if (blockHash > hashTarget) return false; // block hash not within difficulty

		let blkInAmt = 0;
		let blkOutAmt = 0;
		let utxoSet =
			block.height > 0
				? [...calculateUTXOSet(blockchain, getPreviousBlock(blockchain, block))]
				: [];

		for (let j = 1; j < block.transactions.length; j++) {
			const transaction = block.transactions[j];
			if (!transaction.inputs.length || !transaction.outputs.length)
				throw new Error("TX00: invalid input and output lengths");
			if (transaction.hash !== calculateTransactionHash(transaction))
				throw new Error("TX01: invalid hash"); // hash is invalid
			if (!transaction.version || !transaction.timestamp)
				throw new Error("TX02: no version or timestamp");

			let txInAmt = 0;
			for (const input of transaction.inputs) {
				const txo = utxoSet.find(
					utxo => utxo.txHash === input.txHash && utxo.outIndex === input.outIndex
				);
				if (!txo)
					throw new Error(`TX00: input ${input.txHash}:${input.outIndex} doesnt exist as a utxo`);
				if (txo.address !== getAddressFromPKHex(params, input.publicKey))
					throw new Error("TX03: Input invalid public key");
				txInAmt += txo.amount;
				utxoSet = utxoSet.filter(utxo => utxo !== txo); // reference equality is enough
			}

			let txOutAmt = 0;
			for (const output of transaction.outputs) {
				if (!isAddressValid(params, output.address))
					throw new Error("TX04: Output address invalid");
				txOutAmt += output.amount;
			}

			if (txInAmt > txOutAmt) throw new Error("TX00: more input that output amount");

			// check signature
			const senderPK = transaction.inputs[0].publicKey;
			const preImage = calculateTransactionPreImage(transaction);

			for (const input of transaction.inputs) {
				if (input.publicKey !== senderPK) throw new Error("TX00: more than one sender"); // only one sender allowed (for now)
				try {
					const key = ec.keyFromPublic(senderPK, "hex");
					if (!key.verify(preImage, input.signature)) throw new Error("TX00: signature not valid"); // signature not valid
				} catch {
					throw new Error("TX00: signature not valid");
				}
			}

			blkInAmt += txInAmt;
			blkOutAmt += txOutAmt;
		}

		// ---- coinbase transaction ----
		const coinbaseTx = block.transactions[0];
		if (coinbaseTx.hash !== calculateTransactionHash(coinbaseTx)) return false; // hash is invalid
		if (!coinbaseTx.version || !coinbaseTx.timestamp) return false;
		if (coinbaseTx.inputs.length > 0) return false; // coinbase must not have inputs
		if (coinbaseTx.outputs.length !== 1) return false; // wrong output length
		if (!isAddressValid(params, coinbaseTx.outputs[0].address)) return false; // miner address invalid

		const coinbaseAmt = coinbaseTx.outputs[0].amount;
		const fee = blkOutAmt - blkInAmt;
		const blockReward = calculateBlockReward(params, block.height);
		if (coinbaseAmt > fee + blockReward) return false; // coinbase amt larger than allowed
		// ---- end coinbase tx ----

		// ---- end block check ----
		if (block.height === 0 && !block.previousHash) return true; // reached genesis
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

function isTransactionValidInBlockchain(blockchain, minedBlock, transaction) {
	if (!transaction.inputs || !transaction.outputs) return false;

	if (transaction.hash !== calculateTransactionHash(transaction)) return false; // hash is valid
	if (!transaction.version || !transaction.timestamp) return false;

	const transactionSet = calculateTransactionSet(blockchain, minedBlock);

	if (!transaction.inputs.length) {
		// potential coinbase tx
		if (transaction.outputs.length !== 1) return false; // wrong length of output
		if (!transaction.outputs[0].address) return false; // no miner

		const outputAmount = transaction.output[0].amount;
		const blockReward = calculateBlockReward(params, minedBlock.height);
		const fee = outputAmount + blockReward - inputAmount;
		return true;
	}
	// normal transaction

	if (!transaction.inputs.length || !transaction.outputs.length) return false;

	const utxoSet = calculateUTXOSet(blockchain, minedBlock);

	let inputAmount = 0;
	for (const input of transaction.inputs) {
		let found = false;
		for (const utxo of utxoSet) {
			if (utxo.txHash === input.txHash && utxo.outIndex === input.outIndex) {
				inputAmount += utxo.amount;
				found = true;
				break;
			}
		}
		if (!found) return false; // input doesnt exist as a utxo
	}

	let outputAmount = transaction.outputs.reduce((total, output) => total + output.amount, 0);

	if (inputAmount > outputAmount) return false; // more input that output

	// TODO check for no duplicate utxo

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
