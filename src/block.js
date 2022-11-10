import SHA256 from "crypto-js/sha256.js";
import { hexToBigInt } from "./helpers.js";

// function mutates array
export const calculateMerkleRoot = (hashes) => {
  if (!hashes) throw Error("invalid hashes array when calculating merkle root");

  if (hashes.length % 2 === 1)
    // odd number of hashes
    hashes.push(hashes[hashes.length - 1]);

  const parentHashes = [];
  for (let i = 0; i < hashes.length; i += 2) {
    const left = hashes[i];
    const right = hashes[i + 1];
    const hash = SHA256(left + right).toString();
    parentHashes.push(hash);
  }

  if (parentHashes.length === 1) return parentHashes[0];

  return calculateMerkleRoot(parentHashes);
};

export const calculateBlockHash = (block) =>
  SHA256(
    block.height +
      block.previousHash +
      block.merkleRoot +
      block.timestamp +
      block.version +
      block.difficulty +
      block.nonce
  ).toString();

export const createBlock = (params, parentBlock, difficulty, transactions) => ({
  height: parentBlock.height + 1,
  previousHash: parentBlock.hash,
  merkleRoot: calculateMerkleRoot(transactions.map((tx) => tx.hash)),
  timestamp: Date.now(),
  version: params.version,
  difficulty,
  nonce: 0,
  transactions,
});

/**
 *
 * @param {Block} block
 * @param {BigInt} target
 * @returns
 */
export function* mineBlock(block, target) {
  while (true) {
    block.hash = calculateBlockHash(block);
    const currentHash = hexToBigInt(block.hash);
    if (currentHash <= target)
      // mining successful
      return yield block;
    block.nonce++;
    yield block;
  }
}

export const calculateBlockReward = (params, height) => {
  const n = Math.trunc(height / params.blkRewardHalflife);
  return Math.trunc(params.initBlkReward / 2 ** n); // cant be decimal, truncated
};

/**
 *
 * @param {*} params
 * @param {Block} block
 * @returns hash target in bigint
 */
export const calculateHashTarget = (params, block) => {
  // divide by multiplying divisor by 1000 then dividing results by 1000
  const initHashTarget = hexToBigInt(params.initHashTarg);
  const hashTarget =
    (initHashTarget / BigInt(Math.trunc(block.difficulty * 1000))) * 1000n;
  if (hashTarget > initHashTarget)
    // clamp hash target if too big
    return initHashTarget;
  return hashTarget;
};
