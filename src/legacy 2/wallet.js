const bip39 = require("bip39");
const HdKey = require("hdkey");

const { getAddressFromPKHex } = require("./key");

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
const deriveKeys = (params, xprv, account, change, index) => {
	const hdKey = HdKey.fromExtendedKey(xprv);
	const childKeys = hdKey.derive(
		`m/${params.derivPurpose}'/${params.derivCoinType}'/${account}'/${change}/${index}`
	);
	return {
		xprv: childKeys.privateExtendedKey,
		xpub: childKeys.publicExtendedKey,
		sk: childKeys.privateKey.toString("hex"),
		pk: childKeys.publicKey.toString("hex"),
		chainCode: childKeys.chainCode.toString("hex"),
		addr: getAddressFromPKHex(params, childKeys.publicKey.toString("hex")),
	};
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
