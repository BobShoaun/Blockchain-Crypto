import SHA256 from "crypto-js/sha256.js";
import elliptic from "elliptic";
import sizeof from "object-sizeof";

const ec = new elliptic.ec("secp256k1");

export const createTransaction = (params, inputs, outputs, message = null) => ({
  timestamp: Date.now(),
  version: params.version,
  inputs,
  outputs,
  message,
});

export const calculateTransactionHash = transaction =>
  SHA256(
    transaction.timestamp +
      transaction.version +
      JSON.stringify(
        transaction.inputs.map(input => ({
          txHash: input.txHash,
          outIndex: input.outIndex,
          publicKey: input.publicKey,
          signature: input.signature,
        }))
      ) +
      JSON.stringify(
        transaction.outputs.map(output => ({
          address: output.address,
          amount: output.amount,
        }))
      ) +
      (transaction.message ?? "")
  ).toString();

export const calculateTransactionPreImage = transaction => {
  const txCopy = structuredClone(transaction); // deep copy
  for (const input of txCopy.inputs) input.signature = input.publicKey; // placeholder for generating pre-image
  return calculateTransactionHash(txCopy);
};

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

export const getCleanTransaction = ({
  hash,
  timestamp,
  version,
  message,
  inputs,
  outputs,
}) => {
  const _inputs = inputs.map(({ txHash, outIndex, publicKey, signature }) => ({
    txHash,
    outIndex,
    publicKey,
    signature,
  }));
  const _outputs = outputs.map(({ address, amount }) => ({ address, amount }));
  return {
    hash,
    timestamp,
    version,
    message,
    inputs: _inputs,
    outputs: _outputs,
  };
};

export const getTransactionSize = transaction =>
  sizeof(getCleanTransaction(transaction));
