const blockRewardHalflife = 10; // in block height
const initialBlockReward = 50; // in coins
const difficultyRecalcHeight = 20; // in block height
const initialBlockDifficulty = 1;
const targetBlockTime = 5 * 60; // 5 minutes in seconds
const initialHashTarget = BigInt(
	"0x00ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
);
const coin = 100000000; // amounts are stored as the smallest unit, this is how many of the smallest unit that amounts to 1 coin.

module.exports = {
	blockRewardHalflife,
	initialBlockDifficulty,
	initialBlockReward,
	difficultyRecalcHeight,
	targetBlockTime,
	initialHashTarget,
	coin,
};
