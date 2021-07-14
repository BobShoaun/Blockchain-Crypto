const { generateHdKey, getHdKey, validateMnemonic, deriveKeys } = require("../../index");

// consensus parameters
const params = {
	name: "Bobcoin",
	symbol: "XBC",
	coin: 100_000_000, // amounts are stored as the smallest unit, this is how many of the smallest unit that amounts to 1 coin.
	version: "1.0.0",
	addressPre: "06",
	checksumLen: 4,
	initBlkReward: 500 * 100_000_000, // in coins
	blkRewardHalflife: 10, // in block height
	initBlkDiff: 1,
	initHashTarg: "0fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
	targBlkTime: 5 * 60, // 5 minutes in seconds
	diffRecalcHeight: 20, // in block height
	minDiffCorrFact: 1 / 4,
	maxDiffCorrFact: 4,
	blkMaturity: 6, // number of blocks that has to be mined on top (confirmations + 1) to be considered matured
	hardCap: 500_000_000 * 100_000_000, // upper bound to amt of coins in circulation
	derivPurpose: 44, // bip 44
	derivCoinType: 1, // coin type for all test nets as of bip44 spec
};

test("hd wallet generation random", async () => {
	const { mnemonic, xprv, xpub } = await generateHdKey("", "english");
	expect(validateMnemonic(mnemonic, "english")).toBe(true);
	const childKey = deriveKeys(params, xpub, 0, 0, 0);
	console.log(childKey.privateExtendedKey);
	console.log(childKey.publicExtendedKey);
});

test("get hd wallet and wordlist validation", async () => {
	const mnemonicEnglish =
		"accuse visa village supply tell move quality increase board critic predict opera";

	const mnemonicEspanol =
		"libertad mimo bolero catre opaco picar edad todo idioma instante dar uno";

	expect(validateMnemonic(mnemonicEspanol, "spanish")).toBe(true);
	expect(validateMnemonic(mnemonicEnglish, "english")).toBe(true);
	const { xprv } = await getHdKey(mnemonicEnglish, "");
	const xprv2 =
		"xprv9s21ZrQH143K299dFZPLphu2pix74eRoQa4e67jN93UDfSJ7P2XEVhHVn2binTJhPbxkCKTLpE54XVk6a9fZjSBg4RVLAhBZQ3sWnfkb7q4";
	expect(xprv).toBe(xprv2);
});
