const { calculateTransactionHash, createTransaction } = require("../../index");

const tx = createTransaction(
  { version: "1.0.0" },
  [
    {
      outIndex: 1,
      txHash: "dfsfd",
      publicKey: "dfsdfsdfsd",
      signature: "ddddd",
    },
  ],
  []
);

tx.timestamp = 1667954342871;
tx.message = null;
console.log(tx);

const hash = calculateTransactionHash(tx);

console.log(hash);
