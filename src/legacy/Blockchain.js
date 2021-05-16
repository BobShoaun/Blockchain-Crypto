const SHA256 = require("crypto-js/sha256");

class Block {
	constructor(height, data = null, dataIsValid = () => true) {
		this.height = height;
		this.data = data;
		this.timestamp = new Date();
		this.dataIsValid = dataIsValid; // function to check if data is valid
		this.previousHash = null;
		this.nonce = 0;
		this.hash = this.calculateHash();
		this.miner = null;
	}

	calculateHash() {
		return SHA256(
			this.height + this.previousHash + this.timestamp + JSON.stringify(this.data) + this.nonce
		).toString();
	}

	mine(miner, difficulty) {
    this.miner = miner;
		while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
			this.nonce++;
			this.hash = this.calculateHash();
		}
	}

	get isValid() {
    if (!this.miner) return false; // miner valid
		if (this.height < 0) return false; // height valid
		if (!this.dataIsValid(this.data, this.miner)) return false; // all data is valid
		return true;
	}
}

class Blockchain {
	constructor() {
		this.chain = [new Block(0)]; // Genesis block
		this.difficulty = 3;
	}

	get latestBlock() {
		return this.chain[this.chain.length - 1];
	}

	get highestBlock() {
		return this.chain.reduce((prev, current) => (prev.height > current.height ? prev : current));
	}

	addBlock(block, miner, previousBlock) {
		block.previousHash = previousBlock.hash;
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
