let parameters = {
	name: "Bobcoin",
	symbol: "BBC", // or BCX ?
	coin: 100000000, // amounts are stored as the smallest unit, this is how many of the smallest unit that amounts to 1 coin.
	initialBlockReward: 50, // in coins
	blockRewardHalflife: 10, // in block height
	initialBlockDifficulty: 1,
	initialHashTarget: BigInt("0x00ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"),
	targetBlockTime: 5 * 60, // 5 minutes in seconds
	difficultyRecalcHeight: 20, // in block height
};

function setParameters(params) {
	parameters = params;
}

module.exports = { ...parameters, setParameters };
