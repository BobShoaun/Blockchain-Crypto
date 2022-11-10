import {
  generateKeys,
  getKeys,
  calculateMerkleRoot,
  bigIntToHex64,
  createTransaction,
  isAddressValid,
  generateHdKeys,
} from "../../index.js";

const mainnetParams = {
  name: "Bobcoin",
  symbol: "XBC",
  coin: 100_000_000, // amounts are stored as the smallest unit, this is how many of the smallest unit that amounts to 1 coin.
  version: "1.3.0",
  addressPre: "06",
  checksumLen: 4,
  initBlkReward: 512 * 100_000_000, // in coins
  blkRewardHalflife: 10_100, // in block height
  initBlkDiff: 1,
  initHashTarg:
    "000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", // max target
  targBlkTime: 8 * 60, // 8 minutes in seconds
  diffRecalcHeight: 50, // in block height
  minDiffCorrFact: 1 / 4,
  maxDiffCorrFact: 4,
  blkMaturity: 6, // number of blocks that has to be mined on top (confirmations + 1) to be considered matured
  hardCap: 10_240_000 * 100_000_000, // upper bound to amt of coins in circulation
  derivPurpose: 44, // bip 44
  derivCoinType: 8888, // coin type for mainnet bobcoin
  genesisBlock: {
    height: 0,
    hash: "0000000feec941f61402e216aad021939642cfee2e97e6fc45c7a692dd3a759f",
    previousHash: null,
    timestamp: 1623366187131,
    version: "1.0.0",
    difficulty: 1,
    nonce: 18189500,
    merkleRoot:
      "fc0f8fbb19f660bd80feeb09ba09869dd954a7811a8451d5a77b521705c8575a",
    transactions: [
      {
        hash: "1209af6a4390ec05767e7e0908a2aabbf9793b2f328fb6fd45328315bcf29c66",
        timestamp: 1623366187129,
        version: "1.0.0",
        inputs: [],
        outputs: [
          {
            address: "8GEN8Ab66ydbi82Q3wVcVwWKpvRVphN",
            amount: 51200000000,
          },
        ],
      },
    ],
  },
};

const keys = generateKeys(mainnetParams);
console.log(keys);
console.log(
  getKeys(
    mainnetParams,
    "0097115d63abd321cd149de798714d57163be842fec7896425fa850091d702ce"
  )
);

console.log(bigIntToHex64(1n));
