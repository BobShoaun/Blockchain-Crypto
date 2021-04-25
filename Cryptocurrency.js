const { Blockchain, Block } = require("./Blockchain.js");
const SHA256 = require("crypto-js/sha256");
const EC = require("elliptic").ec;
const ec = new EC("secp256k1");

const blockReward = 50;

class Transaction {
	constructor(sender, recipient, amount, fee = 0) {
		this.sender = sender;
		this.recipient = recipient;
		this.amount = amount;
		this.fee = fee;
		this.signature = null;
    this.inputs = [];
    this.outputs = [];
    this.hash = this.calculateHash();
	}

	static parse(obj) {
		const transaction = new Transaction(obj.sender, obj.recipient, obj.amount, obj.fee);
		transaction.signature = obj.signature;
		return transaction;
	}

	calculateHash() {
		return SHA256(this.sender + this.recipient + this.amount + this.fee).toString();
	}

	sign(senderPrivateKey) {
		const keyPair = ec.keyFromPrivate(senderPrivateKey, "hex");
		if (keyPair.getPublic("hex") !== this.sender)
			throw new Error("Cannot sign transaction for other wallets");
		// const hash = this.calculateHash();
		this.signature = keyPair.sign(this.hash, "base64").toDER("hex");
	}

	get isValid() {
		if (this.sender == null)
			// miner's reward
			return this.amount == blockReward; // miner reward checks out
		if (this.recipient == null || this.amount == null || this.amount < 0) return false; // individual fields are valid
		if (!this.signature || this.signature.length === 0) return false; // signature is present
		const hash = this.calculateHash();
    if (hash !== this.hash) return false; // hash is valid

		const key = ec.keyFromPublic(this.sender, "hex");
		return key.verify(hash, this.signature); // signature is valid
	}
}

class Cryptocurrency extends Blockchain {
	constructor() {
		super();
		// this.miningReward = 50;
		this.pendingTransactions = [];
    this.transactions = [];
	}

  static parse(obj) {
    const crypto = new Cryptocurrency();
    crypto.transactions = obj.transactions;
    crypto.chain = obj.chain;
    crypto.difficulty = obj.difficulty;
    return crypto;
  }

	minePendingTransactions(miner) {
		this.pendingTransactions.push(new Transaction(null, miner, blockReward)); // miner's reward
		let block = new Block(new Date(), this.pendingTransactions);
		this.addBlock(block, miner);
		this.pendingTransactions = [];
    return block;
	}

  mineTransactions(miner, transactions, previousBlock) {
    const mempool = this.getMempool(previousBlock);
    
    if (!transactions.every(transaction => mempool.some(tx => tx.hash === transaction.hash))) {
      // return false
      throw new Error("Cannot mine transactions not in mempool");
    }

    const coinbaseTransaction = new Transaction(null, miner, blockReward) // miner's reward
    const block = new Block(previousBlock.height + 1, new Date(), [coinbaseTransaction, ...transactions]);

    this.addBlock(block, miner, previousBlock);
    return block;
  }

  getMempool(currentBlock) {
    let currentChain = this.chain.filter(b => b.height <= currentBlock.height);
    let confirmedTransactions = [];
    for(let previousBlock of currentChain) {
      if (Array.isArray(previousBlock.data)) {
        confirmedTransactions.push(...previousBlock.data);
      }
    }
    return this.transactions.filter(transaction => !confirmedTransactions.some(tx => tx.hash === transaction.hash));
  }

  getUTXOset(block) {
    
  }

	addTransaction(transaction) {
		if (!transaction.isValid) throw new Error("Cannot add invalid transaction to chain");
		this.transactions.push(transaction);
	}

	getBalance(address) {
		let balance = 0;
		for (const block of this.chain) {
			for (const trans of block.data) {
				if (trans.sender === address) balance -= trans.amount;
				if (trans.recipient === address) balance += trans.amount;
			}
		}
		return balance;
	}
}

module.exports = { Cryptocurrency, Transaction };
