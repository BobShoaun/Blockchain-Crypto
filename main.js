const blockchain = require("./Blockchain");
const crypto = require("./Cryptocurrency");
const keygen = require("./KeyGenerator");

module.exports = { ...blockchain, ...crypto, ...keygen };