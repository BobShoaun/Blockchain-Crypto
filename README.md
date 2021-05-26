# BlockCrypto

This is a core blockchain package coded in Javascript which contains business logic for managing a blockchain cryptocurrency. This blockchain implementation closely resembles that of Bitcoin. Much thanks to the many online resources and youtube videos which helped in the making of this package.

# Installation

```
npm install blockcrypto
```

# How it works?

- Proof of work blockchain
- Cryptocurrency implementation with mining rewards and mempool (pending transactions)
- Mining algorithm finds SHA256 hash that is lower than the target hash by modifying the nonce value
- secp256k1 elliptic curve function used to generate public key

- utxo used as input and outputs of transactions.
- address generated from public key by SHA256 and RIPEMD160 algorithms with checksum implemented, represented in a base58 format.
