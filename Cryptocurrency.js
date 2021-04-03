const { Blockchain, Block } = require("./Block.js");
const SHA256 = require("crypto-js/sha256");
const EC = require("elliptic").ec;
const ec = new EC("secp256k1");

const miningReward = 50;

class Transaction {
	constructor(from, to, amount, fee = 0) {
		this.from = from;
		this.to = to;
		this.amount = amount;
    this.fee = fee;
		this.signature = null;
	}

	calculateHash() {
		return SHA256(this.from + this.to + this.amount).toString();
	}

	sign(signingKey) {
		if (signingKey.getPublic("hex") !== this.from)
			throw new Error("Cannot sign transaction for other wallets");
		const hash = this.calculateHash();
		this.signature = signingKey.sign(hash, "base64").toDER("hex");
	}

	get isValid() {
    if (this.from == null) // miner's reward
      return this.amount == miningReward;
		if (this.to == null || this.amount == null || this.amount < 0)
			return false;
		if (!this.signature || this.signature.length === 0) return false;
		const key = ec.keyFromPublic(this.from, "hex");
		const hash = this.calculateHash();
		return key.verify(hash, this.signature);
	}
}

class Cryptocurrency extends Blockchain {
	constructor() {
		super();
		// this.miningReward = 50;
		this.pendingTransactions = [];
	}

	minePendingTransactions(miner) {
    this.pendingTransactions.push(new Transaction(null, miner, miningReward)); // miner's reward
		let block = new Block(new Date(), this.pendingTransactions);
		this.addBlock(block, miner);
		this.pendingTransactions = [];
	}

	addTransaction(transaction) {
		if (!transaction.isValid) throw new Error("Cannot add invalid transaction to chain");
		this.pendingTransactions.push(transaction);
	}

	getBalance(address) {
		let balance = 0;
		for (const block of this.chain) {
			for (const trans of block.data) {
				if (trans.from === address) balance -= trans.amount;
				if (trans.to === address) balance += trans.amount;
			}
		}
		return balance;
	}
}

module.exports = { Cryptocurrency, Transaction };
