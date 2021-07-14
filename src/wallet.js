const EC = require("elliptic").ec;
const ec = new EC("secp256k1");

const bip39 = require("bip39");
const HdKey = require("hdkey");

const { hexToBase58 } = require("./key");

const generateHdKey = async (password, wordlist) => {
	bip39.setDefaultWordlist(wordlist);
	const mnemonic = bip39.generateMnemonic();
	const seedBuf = await bip39.mnemonicToSeed(mnemonic, "mnemonic" + password);
	const masterKey = HdKey.fromMasterSeed(seedBuf);
	return { mnemonic, xprv: masterKey.privateExtendedKey, xpub: masterKey.publicExtendedKey };
};

const getHdKey = async (mnemonic, password) => {
	const seedBuf = await bip39.mnemonicToSeed(mnemonic, "mnemonic" + password);
	const masterKey = HdKey.fromMasterSeed(seedBuf);
	return { xprv: masterKey.privateExtendedKey, xpub: masterKey.publicExtendedKey };
};

// extended keys must be of root (master) level
const deriveKeys = (params, extendedPrivateKey, account, change, index) => {
	const hdKey = HdKey.fromExtendedKey(extendedPrivateKey);
	const childKeys = hdKey.derive(
		`m/${params.derivPurpose}/${params.derivCoinType}/${account}'/${change}/${index}`
	);
	return childKeys;
};

const getSeed = async (mnemonic, password) => {
	const seed = (await bip39.mnemonicToSeed(mnemonic, "mnemonic" + password)).toString("hex");
	return seed;
};

const getMnemonic = async seed => {
	bip39.entropyToMnemonic();
};

const validateMnemonic = (mnemonic, wordlist) => {
	bip39.setDefaultWordlist(wordlist);
	return bip39.validateMnemonic(mnemonic);
};

module.exports = {
	generateHdKey,
	getHdKey,
	validateMnemonic,
	deriveKeys,
};
