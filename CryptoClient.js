// new alternative crypto client api, made in a more functional way for better integration with a peer to peer or client server model
const SHA256 = require("crypto-js/sha256");
const EC = require("elliptic").ec;
const ec = new EC("secp256k1");

const blockRewardHalflife = 10; // in block height
const initialBlockReward = 50; // in coins
const difficultyRecalcHeight = 20; // in block height
const initialBlockDifficulty = 1; // in leading zeros
const targetBlockTime = 5 * 60; // 5 minutes

let utxoSets = {}; // cached UTXOsets for efficiency
let transactionSets = {}; // cached txSet for efficiency

// TODO find better elliptic curve library
function generateKeyPair() {
	const keyPair = ec.genKeyPair();
	return { sk: keyPair.getPrivate("hex"), pk: keyPair.getPublic("hex") };
}

function getKeyPair(secretKey) {
	const keyPair = ec.keyFromPrivate(secretKey, "hex");
	return { sk: keyPair.getPrivate("hex"), pk: keyPair.getPublic("hex") };
}

function resetCache() {
	utxoSets = {};
	transactionSets = {};
}

function createBlockchain(blocks) {
	const blockchain = [...blocks];
	blockchain.sort((a, b) => a.height - b.height);
	return blockchain;
}

function addBlockToBlockchain(blockchain, block) {
	let i = blockchain.length - 1;
	for (; i >= 0; i--) {
		if (blockchain[i].height <= block.height) break;
	}
	blockchain.splice(i + 1, 0, block);
}

function calculateMempool(blockchain, headBlock, transactions) {
	const transactionSet = calculateTransactionSet(blockchain, headBlock);
	return transactions.filter(tx => !transactionSet.some(txSet => txSet.hash === tx.hash));
}

function getPreviousBlock(blockchain, block) {
	for (let i = blockchain.length - 1; i >= 0; i--)
		if (blockchain[i].hash === block.previousHash) return blockchain[i];
	return null;
}

function calculateTransactionSet(blockchain, headBlock) {
	if (!headBlock) return [];

	if (headBlock.hash in transactionSets) return transactionSets[headBlock.hash];

	const transactionSet = [
		...calculateTransactionSet(blockchain, getPreviousBlock(blockchain, headBlock)),
		...headBlock.transactions,
	];

	transactionSets[headBlock.hash] = transactionSet;
	return transactionSet;
}

function calculateUTXOSet(blockchain, headBlock) {
	if (!headBlock) return [];
	if (headBlock.hash in utxoSets) return utxoSets[headBlock.hash];

	const utxoSet = [...calculateUTXOSet(blockchain, getPreviousBlock(blockchain, headBlock))];

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

function mineGenesisBlock(miner) {
	const block = {
		height: 0,
		transactions: [],
		timestamp: new Date(),
		nonce: -1,
	};
	return mineBlock(block, miner);
}

function mineNewBlock(headBlock, transactions, miner) {
	// const utxoSet = calculateUTXOSet(blockchain, headBlock);

	let totalFee = 0;
	for (const transaction of transactions) {
		// for (const input of transaction.inputs) {
		// 	for (const utxo of utxoSet) {
		// 		if (utxo.txHash === input.txHash) {
		// 			totalFee += utxo.amount;
		// 		}
		// 	}
		// }
		for (const input of transaction.inputs) totalFee += input.amount;
		for (const output of transaction.outputs) totalFee -= output.amount;
	}

	if (totalFee > 0) {
		const feeOutput = {
			address: miner,
			amount: totalFee,
			timestamp: new Date(),
		};
		feeOutput.hash = calculateUTXOHash(feeOutput);
		const feeTransaction = {
			inputs: [],
			outputs: [feeOutput],
		};
		feeTransaction.hash = calculateTransactionHash(feeTransaction);
		transactions = [feeTransaction, ...transactions];
	}

	const block = {
		height: headBlock.height + 1,
		previousHash: headBlock.hash,
		transactions,
		timestamp: new Date(),
		nonce: -1,
	};

	return mineBlock(block, miner);
}

function mineBlock(block, miner) {
	const coinbaseOutput = {
		address: miner,
		amount: calculateBlockReward(block.height),
		timestamp: new Date(),
	};
	coinbaseOutput.hash = calculateUTXOHash(coinbaseOutput);

	const coinbaseTransaction = {
		inputs: [],
		outputs: [coinbaseOutput],
	};
	coinbaseTransaction.hash = calculateTransactionHash(coinbaseTransaction);

	block.transactions = [coinbaseTransaction, ...block.transactions];
	const difficulty = calculateBlockDifficulty(block.height);
	do {
		// TODO: better mining algorithm
		block.nonce++;
		block.hash = calculateBlockHash(block);
	} while (block.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0"));
	return block;
}

function calculateBlockHash(block) {
	return SHA256(
		block.height +
			JSON.stringify(block.transactions) +
			block.timestamp +
			block.previousHash +
			block.nonce
	).toString();
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
		timestamp: new Date(),
	};
	payment.hash = calculateUTXOHash(payment);

	const outputs = [payment];

	const changeAmount = utxoAmount - amount - fee;
	if (changeAmount > 0) {
		const change = {
			address: sender,
			amount: changeAmount,
			timestamp: new Date(),
		};
		change.hash = calculateUTXOHash(change);
		outputs.push(change);
	}

	const transaction = {
		inputs,
		outputs,
	};
	transaction.hash = calculateTransactionHash(transaction);
	const keyPair = ec.keyFromPrivate(senderSK, "hex");
	transaction.signature = keyPair.sign(transaction.hash, "base64").toDER("hex");
	return transaction;
}

function calculateTransactionHash(transaction) {
	return SHA256(
		JSON.stringify(transaction.inputs) + JSON.stringify(transaction.outputs)
	).toString();
}

function calculateBlockReward(height) {
	const n = Math.trunc(height / blockRewardHalflife);
	if (n == 0) return initialBlockReward;
	return initialBlockReward / (2 * n);
}

function calculateBlockDifficulty(height) {
	if (height % difficultyRecalcHeight === 0) {
	}
	return initialBlockDifficulty;
}

function calculateBalance(blockchain, headBlock, address) {
	let utxoSet = calculateUTXOSet(blockchain, headBlock);
	utxoSet = utxoSet.filter(utxo => utxo.address === address);
	return utxoSet.reduce((prev, curr) => prev + curr.amount, 0);
}

function getHighestValidBlock(blockchain) {
	const maxHeight = blockchain[blockchain.length - 1].height;
	let earliestBlock = blockchain[blockchain.length - 1];
	for (let i = blockchain.length - 1; i >= 0; i--) {
		if (blockchain[i].height !== maxHeight) break;
		if (blockchain[i].timestamp < earliestBlock.timestamp) earliestBlock = blockchain[i];
	}
	return earliestBlock;
}

// returns new blockchain with invalid and unecessasary blocks removed
function pruneBlockchain(blockchain) {}

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

function isBlockValid(block) {
	if (block.height < 0) return false; // height valid
	if (block.hash !== calculateBlockHash(block)) return false; // block hash valid

	const difficulty = calculateBlockDifficulty(block.height);
	if (block.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) return false; // block hash fits difficulty

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
	if (
		!transaction.inputs ||
		!transaction.inputs.length ||
		!transaction.outputs ||
		!transaction.outputs.length
	)
		return false;

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
		const key = ec.keyFromPublic(sender, "hex");
		return key.verify(transaction.hash, transaction.signature); // signature is valid
	} catch {
		return false;
	}
}

module.exports = {
	generateKeyPair,
	getKeyPair,
	mineGenesisBlock,
	mineNewBlock,
	createBlockchain,
	addBlockToBlockchain,
	getHighestValidBlock,
	calculateMempool,
	createAndSignTransaction,
	calculateBlockHash,
	calculateTransactionHash,
	calculateBlockReward,
	calculateBlockDifficulty,
	calculateUTXOSet,
	calculateBalance,
	isBlockchainValid,
	isBlockValid,
	isTransactionValid,
	resetCache,
};
