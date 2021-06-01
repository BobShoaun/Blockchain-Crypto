const {
	calculateTransactionSet,
	calculateTransactionHash,
	calculateTransactionPreImage,
} = require("./transaction");

const { calculateUTXOSet, updateUTXOSet } = require("./utxo");
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
		if (block.height < 0) throw new Error("BLK00: invalid height"); // height invalid
		if (!block.version || !block.timestamp) throw new Error("BL01: no version or timestamp");
		if (!block.transactions.length) throw new Error("BLK02: no transactions"); // must have at least 1 tx (coinbase)
		if (block.hash !== calculateBlockHash(block)) throw new Error("BLK03: invalid hash"); // block hash invalid
		if (block.difficulty !== calculateBlockDifficulty(params, blockchain, block))
			throw new Error("BLK04: invalid difficulty");

		const hashTarget = calculateHashTarget(params, block);
		const blockHash = hexToBigInt(block.hash);
		if (blockHash > hashTarget) throw new Error("BLK05: hash not within target"); // block hash not within difficulty

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
			}

			let txOutAmt = 0;
			for (const output of transaction.outputs) {
				if (!isAddressValid(params, output.address))
					throw new Error("TX04: Output address invalid");
				txOutAmt += output.amount;
			}

			updateUTXOSet(utxoSet, transaction);

			if (txInAmt < txOutAmt)
				throw new Error(`TX00: input is ${txInAmt} and output is ${txOutAmt}`);

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
		if (coinbaseTx.hash !== calculateTransactionHash(coinbaseTx))
			throw new Error("CB00: invalid hash"); // hash is invalid
		if (!coinbaseTx.version || !coinbaseTx.timestamp)
			throw new Error("CB01: no version or timestamp");
		if (coinbaseTx.inputs.length > 0) throw new Error("CB02: more than 0 inputs"); // coinbase must not have inputs
		if (coinbaseTx.outputs.length !== 1) throw new Error("CB03: invalid output length"); // wrong output length
		if (!isAddressValid(params, coinbaseTx.outputs[0].address))
			throw new Error("CB04: invalid miner address"); // miner address invalid

		const coinbaseAmt = coinbaseTx.outputs[0].amount;
		const fee = blkInAmt - blkOutAmt;
		const blockReward = calculateBlockReward(params, block.height);
		if (coinbaseAmt > fee + blockReward) throw new Error("CB05: reward larger than allowed"); // coinbase amt larger than allowed
		// ---- end coinbase tx ----

		// ---- end block check ----
		if (block.height === 0 && !block.previousHash) return true; // reached genesis
		if (prevBlock !== headBlock && prevBlock.height !== block.height + 1)
			throw new Error("BC00: prev block with unmatching heights"); // previous block with unmatching heights

		prevBlock = block;
		currBlockHash = block.previousHash;
	}
	return false;
}

// is the block valid in the context of the entire blockchain?
function isBlockValidInBlockchain(params, blockchain, block) {
	if (block.height < 0) throw new Error("BLK00: invalid height"); // height invalid
	if (!block.version || !block.timestamp) throw new Error("BL01: no version or timestamp");
	if (!block.transactions.length) throw new Error("BLK01: no transactions"); // must have at least 1 tx (coinbase)
	if (block.hash !== calculateBlockHash(block)) throw new Error("BLK02: invalid hash"); // block hash invalid
	if (block.difficulty !== calculateBlockDifficulty(params, blockchain, block))
		throw new Error("BLK03: invalid difficulty");

	const hashTarget = calculateHashTarget(params, block);
	const blockHash = hexToBigInt(block.hash);
	if (blockHash > hashTarget) throw new Error("BLK04: hash not within target"); // block hash not within difficulty

	let blkInAmt = 0;
	let blkOutAmt = 0;
	let utxoSet =
		block.height > 0 ? [...calculateUTXOSet(blockchain, getPreviousBlock(blockchain, block))] : [];

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
		}

		let txOutAmt = 0;
		for (const output of transaction.outputs) {
			if (!isAddressValid(params, output.address)) throw new Error("TX04: Output address invalid");
			txOutAmt += output.amount;
		}

		updateUTXOSet(utxoSet, transaction);

		if (txInAmt < txOutAmt) throw new Error(`TX00: input is ${txInAmt} and output is ${txOutAmt}`);

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
	if (coinbaseTx.hash !== calculateTransactionHash(coinbaseTx))
		throw new Error("CB00: invalid hash"); // hash is invalid
	if (!coinbaseTx.version || !coinbaseTx.timestamp)
		throw new Error("CB01: no version or timestamp");
	if (coinbaseTx.inputs.length > 0) throw new Error("CB02: more than 0 inputs"); // coinbase must not have inputs
	if (coinbaseTx.outputs.length !== 1) throw new Error("CB03: invalid output length"); // wrong output length
	if (!isAddressValid(params, coinbaseTx.outputs[0].address))
		throw new Error("CB04: invalid miner address"); // miner address invalid

	const coinbaseAmt = coinbaseTx.outputs[0].amount;
	const fee = blkInAmt - blkOutAmt;
	const blockReward = calculateBlockReward(params, block.height);
	if (coinbaseAmt > fee + blockReward)
		throw new Error(`CB05: reward of ${coinbaseAmt} larger than allowed ${fee} + ${blockReward}`); // coinbase amt larger than allowed
	// ---- end coinbase tx ----

	return true;
}

function isBlockValid(params, block) {}

function isTransactionValidInBlockchain(blockchain, minedBlock, transaction) {}

function isCoinbaseTxValid(params, coinbaseTx) {
	if (coinbaseTx.hash !== calculateTransactionHash(coinbaseTx))
		throw new Error("CB00: invalid hash"); // hash is invalid
	if (!coinbaseTx.version || !coinbaseTx.timestamp)
		throw new Error("CB01: no version or timestamp");
	if (coinbaseTx.inputs.length > 0) throw new Error("CB02: more than 0 inputs"); // coinbase must not have inputs
	if (coinbaseTx.outputs.length !== 1) throw new Error("CB03: invalid output length"); // wrong output length
	if (!isAddressValid(params, coinbaseTx.outputs[0].address))
		throw new Error("CB04: invalid miner address"); // miner address invalid
	return true;
}

// assuming it is not coinbase
function isTransactionValid(params, transaction) {
	if (!transaction.inputs.length || !transaction.outputs.length)
		throw new Error("TX00: invalid input and output lengths");
	if (transaction.hash !== calculateTransactionHash(transaction))
		throw new Error("TX01: invalid hash"); // hash is invalid
	if (!transaction.version || !transaction.timestamp)
		throw new Error("TX02: no version or timestamp");

	for (const output of transaction.outputs)
		if (!isAddressValid(params, output.address)) throw new Error("TX04: Output address invalid");

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
	isCoinbaseTxValid,
};
