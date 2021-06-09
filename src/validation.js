const { calculateTransactionHash, calculateTransactionPreImage } = require("./transaction");

const { calculateUTXOSet, updateUTXOSet, findTXO } = require("./utxo");
const {
	calculateBlockHash,
	calculateBlockReward,
	calculateHashTarget,
	calculateBlockDifficulty,
	calculateMerkleRoot,
} = require("./mine.js");
const { getPreviousBlock } = require("./chain");
const { base58ToHex, getAddressFromPKHex } = require("./key.js");
const { hexToBigInt } = require("./helper");
const { RESULT, result } = require("./validation-codes");

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

function isMempoolTxValid(params, blockchain, headBlock, transaction) {}

function isBlockchainValid(params, blockchain, headBlock) {
	let currBlockHash = headBlock.hash;
	let prevBlock = headBlock;
	for (let i = blockchain.length - 1; i >= 0; i--) {
		const block = blockchain[i];
		if (block.hash !== currBlockHash) continue;

		// ---- block check ----
		if (block.height < 0) return result(RESULT.BK00); // height invalid
		if (!block.version || !block.timestamp) return result(RESULT.BK01);
		if (!block.transactions.length) return result(RESULT.BK02); // must have at least 1 tx (coinbase)
		if (block.hash !== calculateBlockHash(block)) return result(RESULT.BK03); // invalid PoW
		if (block.difficulty !== calculateBlockDifficulty(params, blockchain, block))
			return result(RESULT.BK04);
		if (block.merkleRoot !== calculateMerkleRoot(block.transactions.map(tx => tx.hash)))
			return result(RESULT.BK06);

		const hashTarget = calculateHashTarget(params, block);
		const blockHash = hexToBigInt(block.hash);
		if (blockHash > hashTarget) return result(RESULT.BK05, [hashTarget]); // block hash not within difficulty

		let blkInAmt = 0;
		let blkOutAmt = 0;
		let utxoSet =
			block.height > 0
				? [...calculateUTXOSet(blockchain, getPreviousBlock(blockchain, block))]
				: [];

		for (let j = 1; j < block.transactions.length; j++) {
			const transaction = block.transactions[j];
			if (!transaction.inputs.length || !transaction.outputs.length) return result(RESULT.TX00);
			if (transaction.hash !== calculateTransactionHash(transaction)) return result(RESULT.TX01); // hash is invalid
			if (!transaction.version || !transaction.timestamp) return result(RESULT.TX02);

			let txInAmt = 0;
			for (const input of transaction.inputs) {
				const txo = utxoSet.find(
					utxo => utxo.txHash === input.txHash && utxo.outIndex === input.outIndex
				);
				if (!txo) return result(RESULT.TX03, [input.txHash, input.outIndex]);
				if (txo.address !== getAddressFromPKHex(params, input.publicKey))
					return result(RESULT.TX04);
				txInAmt += txo.amount;
			}

			let txOutAmt = 0;
			for (const output of transaction.outputs) {
				if (!isAddressValid(params, output.address)) return result(RESULT.TX05);
				txOutAmt += output.amount;
			}

			updateUTXOSet(utxoSet, transaction);

			if (txInAmt < txOutAmt) return result(RESULT.TX06, [txInAmt, txOutAmt]);

			// check signature
			const preImage = calculateTransactionPreImage(transaction);
			for (const input of transaction.inputs) {
				try {
					const key = ec.keyFromPublic(input.publicKey, "hex");
					if (!key.verify(preImage, input.signature)) return result(RESULT.TX08); // signature not valid
				} catch {
					return result(RESULT.TX08);
				}
			}

			blkInAmt += txInAmt;
			blkOutAmt += txOutAmt;
		}

		// ---- coinbase transaction ----
		const coinbaseTx = block.transactions[0];
		if (coinbaseTx.hash !== calculateTransactionHash(coinbaseTx)) return result(RESULT.CB00); // hash is invalid
		if (!coinbaseTx.version || !coinbaseTx.timestamp) return result(RESULT.CB01);
		if (coinbaseTx.inputs.length > 0) return result(RESULT.CB02); // coinbase must not have inputs
		if (coinbaseTx.outputs.length !== 1) return result(RESULT.CB03); // wrong output length
		if (!isAddressValid(params, coinbaseTx.outputs[0].address)) return result(RESULT.CB04); // miner address invalid

		const coinbaseAmt = coinbaseTx.outputs[0].amount;
		const fee = blkInAmt - blkOutAmt;
		const blockReward = calculateBlockReward(params, block.height);
		if (coinbaseAmt > fee + blockReward)
			return result(RESULT.CB05, [coinbaseAmt, fee + blockReward]); // coinbase amt larger than allowed
		// ---- end coinbase tx ----

		// ---- end block check ----
		if (block.height === 0 && !block.previousHash) return result(RESULT.VALID); // reached genesis
		if (prevBlock !== headBlock && prevBlock.height !== block.height + 1)
			return result(RESULT.BC00); // previous block with unmatching heights

		prevBlock = block;
		currBlockHash = block.previousHash;
	}
	return result(RESULT.BC02); // no genesis block
}

// is the block valid in the context of the entire blockchain?
function isBlockValidInBlockchain(params, blockchain, block) {
	if (block.height < 0) return result(RESULT.BK00); // height invalid
	if (!block.version || !block.timestamp) return result(RESULT.BK01);
	if (!block.transactions.length) return result(RESULT.BK02); // must have at least 1 tx (coinbase)
	if (block.hash !== calculateBlockHash(block)) return result(RESULT.BK03); // block hash invalid
	if (block.difficulty !== calculateBlockDifficulty(params, blockchain, block))
		return result(RESULT.BK04);
	if (block.merkleRoot !== calculateMerkleRoot(block.transactions.map(tx => tx.hash)))
		return result(RESULT.BK06);

	const hashTarget = calculateHashTarget(params, block);
	const blockHash = hexToBigInt(block.hash);
	if (blockHash > hashTarget) return result(RESULT.BK05, [hashTarget]); // block hash not within difficulty

	let blkInAmt = 0;
	let blkOutAmt = 0;
	let utxoSet =
		block.height > 0 ? [...calculateUTXOSet(blockchain, getPreviousBlock(blockchain, block))] : [];

	for (let j = 1; j < block.transactions.length; j++) {
		const transaction = block.transactions[j];
		if (!transaction.inputs.length || !transaction.outputs.length) return result(RESULT.TX00);
		if (transaction.hash !== calculateTransactionHash(transaction)) return result(RESULT.TX01); // hash is invalid
		if (!transaction.version || !transaction.timestamp) return result(RESULT.TX02);

		let txInAmt = 0;
		for (const input of transaction.inputs) {
			const txo = utxoSet.find(
				utxo => utxo.txHash === input.txHash && utxo.outIndex === input.outIndex
			);
			if (!txo) return result(RESULT.TX03, [input.txHash, input.outIndex]);

			if (txo.address !== getAddressFromPKHex(params, input.publicKey)) return result(RESULT.TX04);
			txInAmt += txo.amount;
		}

		let txOutAmt = 0;
		for (const output of transaction.outputs) {
			if (!isAddressValid(params, output.address)) return result(RESULT.TX05);

			txOutAmt += output.amount;
		}

		updateUTXOSet(utxoSet, transaction);

		if (txInAmt < txOutAmt) return result(RESULT.TX06, [txInAmt, txOutAmt]);

		// check signature
		const preImage = calculateTransactionPreImage(transaction);
		for (const input of transaction.inputs) {
			try {
				const key = ec.keyFromPublic(input.publicKey, "hex");
				if (!key.verify(preImage, input.signature)) return result(RESULT.TX08); // signature not valid
			} catch {
				return result(RESULT.TX08);
			}
		}

		blkInAmt += txInAmt;
		blkOutAmt += txOutAmt;
	}

	// ---- coinbase transaction ----
	const coinbaseTx = block.transactions[0];
	if (coinbaseTx.hash !== calculateTransactionHash(coinbaseTx)) return result(RESULT.CB00); // hash is invalid
	if (!coinbaseTx.version || !coinbaseTx.timestamp) return result(RESULT.CB01);
	if (coinbaseTx.inputs.length > 0) return result(RESULT.CB02); // coinbase must not have inputs
	if (coinbaseTx.outputs.length !== 1) return result(RESULT.CB03); // wrong output length
	if (!isAddressValid(params, coinbaseTx.outputs[0].address)) return result(RESULT.CB04); // miner address invalid

	const coinbaseAmt = coinbaseTx.outputs[0].amount;
	const fee = blkInAmt - blkOutAmt;
	const blockReward = calculateBlockReward(params, block.height);
	if (coinbaseAmt > fee + blockReward) return result(RESULT.CB05, [coinbaseAmt, fee + blockReward]); // coinbase amt larger than allowed

	// ---- end coinbase tx ----

	return result(RESULT.VALID);
}

function isBlockValid(params, block) {}

function isTransactionValidInBlockchain(blockchain, minedBlock, transaction) {}

function isCoinbaseTxValid(params, coinbaseTx) {
	if (coinbaseTx.hash !== calculateTransactionHash(coinbaseTx)) return result(RESULT.CB00); // hash is invalid
	if (!coinbaseTx.version || !coinbaseTx.timestamp) return result(RESULT.CB01);
	if (coinbaseTx.inputs.length > 0) return result(RESULT.CB02); // coinbase must not have inputs
	if (coinbaseTx.outputs.length !== 1) return result(RESULT.CB03); // wrong output length
	if (!isAddressValid(params, coinbaseTx.outputs[0].address)) return result(RESULT.CB04); // miner address invalid
	return result(RESULT.VALID);
}

// assuming it is not coinbase
function isTransactionValid(params, transactions, transaction) {
	if (!transaction.inputs.length || !transaction.outputs.length) return result(RESULT.TX00);
	if (transaction.hash !== calculateTransactionHash(transaction)) return result(RESULT.TX01); // hash is invalid
	if (!transaction.version || !transaction.timestamp) return result(RESULT.TX02);

	let totalOutput = 0;
	for (const output of transaction.outputs) {
		if (!isAddressValid(params, output.address)) return result(RESULT.TX05);
		totalOutput += output.amount;
	}

	let totalInput = 0;
	for (const input of transaction.inputs) {
		const TXO = findTXO(input, transactions);
		if (!TXO) return result(RESULT.TX03, [input.txHash, input.outIndex]);
		if (TXO.address !== getAddressFromPKHex(params, input.publicKey)) return result(RESULT.TX04);
		totalInput += TXO.amount;
	}

	if (totalInput < totalOutput) return result(RESULT.TX06, [totalInput, totalOutput]);
	// check signature
	const preImage = calculateTransactionPreImage(transaction);
	for (const input of transaction.inputs) {
		try {
			const key = ec.keyFromPublic(input.publicKey, "hex");
			if (!key.verify(preImage, input.signature)) return result(RESULT.TX08); // signature not valid
		} catch {
			return result(RESULT.TX08);
		}
	}
	return result(RESULT.VALID);
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
	isMempoolTxValid,
};
