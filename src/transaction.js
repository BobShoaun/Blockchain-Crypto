import SHA256 from "crypto-js/sha256.js";

export const createTransaction = (params, inputs, outputs, message = null) => ({
  timestamp: Date.now(),
  version: params.version,
  inputs,
  outputs,
  message,
});

export const calculateTransactionHash = (transaction) =>
  SHA256(
    transaction.timestamp +
      transaction.version +
      JSON.stringify(
        transaction.inputs.map((input) => ({
          txHash: input.txHash,
          outIndex: input.outIndex,
          publicKey: input.publicKey,
          signature: input.signature,
        }))
      ) +
      JSON.stringify(
        transaction.outputs.map((output) => ({
          address: output.address,
          amount: output.amount,
        }))
      ) +
      (transaction.message ?? "")
  ).toString();

export const calculateTransactionPreImage = (transaction) => {
  const txCopy = structuredClone(transaction); // deep copy
  for (const input of txCopy.inputs) input.signature = input.publicKey; // placeholder for generating pre-image
  return calculateTransactionHash(txCopy);
};

// renew
export const signTransaction = (transaction, secretKey) => {
  const preImage = calculateTransactionPreImage(transaction); // preimage hash
  const keyPair = ec.keyFromPrivate(secretKey, "hex");
  return keyPair.sign(preImage, "hex").toDER("hex");
};

export const createInput = (txHash, outIndex, publicKey) => ({
  txHash,
  outIndex,
  publicKey,
  signature: null,
});

export const createOutput = (address, amount) => ({
  address,
  amount,
});
