const { generateVanityAddress } = require("../../index");

const params = {
	name: "Bobcoin",
	symbol: "BBC", // or BCX ?
	coin: 100000000, // amounts are stored as the smallest unit, this is how many of the smallest unit that amounts to 1 coin.
	version: 1,
	addressPre: "06",
	checksumLen: 4,
	initBlkReward: 50, // in coins
	blkRewardHalflife: 10, // in block height
	initBlkDiff: 1,
	initHashTarg: "0fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
	targBlkTime: 5 * 60, // 5 minutes in seconds
	diffRecalcHeight: 20, // in block height
	minDiffCorrFact: 1 / 4,
	maxDiffCorrFact: 4,
};

// const regex = /^[8,9]b[0,o,O]b/i;
// const regex = /^[8,9]hell[0,o,O]/i;
const regex = /^[8,9]fuck/i;
const limit = 1000000;

let keys = null;
for (keys of generateVanityAddress(params, regex, limit)) {
	process.stdout.clearLine();
	process.stdout.cursorTo(0);
	process.stdout.write(keys.address);
}
process.stdout.clearLine();
process.stdout.cursorTo(0);
console.log(keys);
