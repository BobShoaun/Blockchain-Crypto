// new alternative crypto client api, made in a more functional way for better integration with a peer to peer or client server model

module.exports = {
	...require("./src/parameter"),
	...require("./src/key"),
	...require("./src/chain"),
	...require("./src/mine"),
	...require("./src/transaction"),
	...require("./src/validation"),
	...require("./helper"),
};
