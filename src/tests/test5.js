import {
  generateKeys,
  getKeys,
  calculateMerkleRoot,
  bigIntToHex64,
  createTransaction,
  isAddressValid,
  generateHdKeys,
  getTransactionSize,
  getBlockSize,
} from "../../index.js";

console.log(getTransactionSize(mainnetParams.genesisBlock.transactions[0]));
console.log(getBlockSize(mainnetParams.genesisBlock));
