const SHA256 = require("crypto-js/sha256");

class Block {
	constructor(height, timestamp, data, previousHash = null) {
    this.height = height;
		this.timestamp = timestamp;
		this.data = data;
		this.previousHash = previousHash;
		this.nonce = 0;
		this.hash = this.calculateHash();
    this.previous = '';
	}

	calculateHash() {
		return SHA256(
			this.index + this.previousHash + this.timestamp + JSON.stringify(this.data) + this.nonce
		).toString();
	}

	mine(miner, difficulty) {
    while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
      this.nonce++;
			this.hash = this.calculateHash();
		}
    this.miner = miner;
	}

	get isValid() {
		for (const datum of this.data) if (!datum.isValid) return false;
		return true;
	}
}

class Blockchain {
	constructor() {
		this.chain = [new Block(0, new Date(), "Genesis")];
		this.difficulty = 3;
	}

	get latestBlock() {
		return this.chain[this.chain.length - 1];
	}

  get heighestBlock() {
    return this.chain.reduce((prev, current) => prev.height > current.height ? prev : current);
  }

	addBlock(block, miner) {
		block.previousHash = this.latestBlock.hash;
		block.mine(miner, this.difficulty);
		this.chain.push(block);
	}

	get isValid() {
		for (let i = 1; i < this.chain.length; i++) {
			const current = this.chain[i];
			const prev = this.chain[i - 1];

			if (!current.isValid) return false;

			if (current.hash !== current.calculateHash()) return false;

			if (current.previousHash !== prev.calculateHash()) return false;
		}
		return true;
	}
}

module.exports = { Blockchain, Block };
