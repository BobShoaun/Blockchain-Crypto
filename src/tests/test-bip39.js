const bip39 = require("bip39");

async function generate() {
	bip39.setDefaultWordlist("spanish");
	const mnemonic = bip39.generateMnemonic();
	console.log(mnemonic);
	console.log(bip39.validateMnemonic(mnemonic));

	const seed = (await bip39.mnemonicToSeed(mnemonic, "mnemonic")).toString("hex");
	console.log(seed);
}

// generate();

async function getSeedFromMnemonic(mnemonic, wordlist) {
	bip39.setDefaultWordlist(wordlist);
	if (!bip39.validateMnemonic(mnemonic)) return null;
	const bytes = await bip39.mnemonicToSeed("hello");
	const seed = bytes.toString("hex");
	return seed;
}

(async function () {
	// console.log(await getSeedFromMnemonic("h", "english"));
	const mnemonic = bip39.entropyToMnemonic(
		"0x8ee2897a90b0245a89d76a862c60db10e40ac085b92dcc77b09450e70cdeacfd3a9b4ef0b70f071d8ae5f8120c604d2394e4716aa1e81a91a847a26ce6f1cc67",
		"spanish"
	);
	// bip39.setDefaultWordlist("spanish");
	// const mnemonic = bip39.generateMnemonic();
	console.log(mnemonic);
})();
