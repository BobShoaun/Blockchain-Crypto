class Parameters {
	constructor() {
		this.name = "Bobcoin";
		this.symbol = "BBC"; // or BCX ?
		this.coin = 100000000; // amounts are stored as the smallest unit, this is how many of the smallest unit that amounts to 1 coin.
		this.initBlockReward = 50; // in coins
		this.blockRewardHalflife = 10; // in block height
		this.initBlockDiff = 1;
		this.initHashTarget = BigInt(
			"0x0fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
		);
		this.targetBlockTime = 5 * 60; // 5 minutes in seconds
		this.diffRecalcHeight = 20; // in block height
		this.minDiffCorrectionFactor = 1 / 4;
		this.maxDiffCorrectionFactor = 4;
	}

	setName(name) {
		this.name = name;
	}

	// setName = name => (this.name = name);
	// setInitBlockReward = initBlockReward => (this.initBlockReward = initBlockReward);
	// setInitBlockDiff = initBlockDiff => (this.initBlockDiff = initBlockDiff);
	// setInitHashTarget = initHashTarget => (this.initHashTarget = initHashTarget);
	// setTargetBlockTime = targetBlockTime => (this.targetBlockTime = targetBlockTime);
	// setDiffRecalcHeight = diffRecalcHeight => (this.diffRecalcHeight = diffRecalcHeight);
	// setParams = params => Object.entries(params).forEach(([key, value]) => (this[key] = value));
}

module.exports = new Parameters();
