// new alternative crypto client api, made in a more functional way for better integration with a peer to peer or client server model
const SHA256 = require("crypto-js/sha256");
const EC = require("elliptic").ec;
const ec = new EC("secp256k1");

const blockRewardHalflife = 10; // in block height
const initialBlockReward = 50; // in coins
const difficultyRecalcHeight = 20; // in block height
const initialBlockDifficulty = 3; // in leading zeros

const utxoSets = [];

function generateKeyPair() {
	const keyPair = ec.genKeyPair();
	return { sk: keyPair.getPrivate("hex"), pk: keyPair.getPublic("hex") };
}

function getKeyPair(secretKey) {
	const keyPair = ec.keyFromPrivate(secretKey, "hex");
	return { sk: keyPair.getPrivate("hex"), pk: keyPair.getPublic("hex") };
}

function createBlockchain(blocks) {
	const blockchain = [...blocks];
	blockchain.sort((a, b) => a.height - b.height);
	return blockchain;
}

function addBlockToBlockchain(blockchain, block) {
	let i = blockchain.length - 1;
	for (; i >= 0; i--) {
		if (blockchain[i].height > block.height) continue;
		break;
	}
	blockchain.splice(i + 1, 0, block);
}

function calculateUTXOSet(blockchain, headBlock) {
	let utxoSet = utxoSets.find(utxoSet => utxoSet.blockHash == headBlock.hash);
	if (utxoSet) return utxoSet.set;

	utxoSet = [];
	for (let i = blockchain.length - 1; i >= 0; i--) {
		if (blockchain[i].hash === headBlock.previousHash) {
			utxoSet = [...calculateUTXOSet(blockchain, blockchain[i])];
			break;
		}
	}

	for (const transaction of headBlock.transactions) {
		for (const input of transaction.inputs) {
			for (let i = 0; i < utxoSet.length; i++) {
				if (utxoSet[i].hash === input.hash) {
					utxoSet.splice(i, 1);
					break; // only remove one as there may be duplicates
				}
			}
		}
		for (const output of transaction.outputs) utxoSet.push(output);
	}
	utxoSets.push({ blockHash: headBlock.hash, set: utxoSet });

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
	let totalFee = 0;
	for (const transaction of transactions) {
		for (const input of transaction.inputs) totalFee += input.amount;
		for (const output of transaction.outputs) totalFee -= output.amount;
	}

	if (totalFee > 0) {
		const feeOutput = {
			address: miner,
			amount: totalFee,
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
	return SHA256(utxo.address + utxo.amount).toString();
}

function createAndSignTransaction(blockchain, headBlock, senderSK, sender, recipient, amount, fee) {
	const utxoSet = calculateUTXOSet(blockchain, headBlock);

	// console.log(utxoSet);
	// pick utxos from front to back.
	let utxoAmount = 0;
	const inputs = [];
	for (const utxo of utxoSet) {
		if (utxoAmount >= amount) break;
		if (utxo.address !== sender) continue;
		utxoAmount += utxo.amount;
		inputs.push(utxo);
	}

	const payment = {
		address: recipient,
		amount,
	};
	payment.hash = calculateUTXOHash(payment);

	const outputs = [payment];

	if (utxoAmount - amount - fee > 0) {
		const change = {
			address: sender,
			amount: utxoAmount - amount - fee,
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
	return initialBlockDifficulty;
}

function calculateBalance(blockchain, headBlock, address) {
	let utxoSet = calculateUTXOSet(blockchain, headBlock);
	utxoSet = utxoSet.filter(utxo => utxo.address === address);
	return utxoSet.reduce((prev, curr) => prev + curr.amount, 0);
}

// returns new blockchain with invalid and uncessasary blocks removed
function pruneBlockchain(blockchain) {}

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

	let minerFound = false;
	for (const transaction of block.transactions) {
		if (!transaction.sender) {
			// coinbase transaction
			if (!transaction.recipient) return false; // coinbase to invalid miner.
			if (minerFound) return false; // found more than one coinbase transaction.
			if (transaction.amount !== calculateBlockReward(block.height)) return false; // wrong block reward.
			minerFound = true;
			continue;
		}
		if (!isTransactionValid(transaction)) return false;
	} // all transactions valid
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
	calculateBlockHash,
	createAndSignTransaction,
	calculateTransactionHash,
	calculateBlockReward,
	calculateBlockDifficulty,
	isBlockchainValid,
	isBlockValid,
	isTransactionValid,
	calculateBalance,
	createBlockchain,
	addBlockToBlockchain,
	calculateUTXOSet,
};
