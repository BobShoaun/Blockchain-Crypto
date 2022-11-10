import { setDefaultWordlist, generateMnemonic, mnemonicToSeed } from "bip39";
import HdKey from "hdkey";
import { getAddressFromPublicKey } from "./key.js";

export const generateHdKeys = async (password, wordList) => {
  setDefaultWordlist(wordList);
  const mnemonic = generateMnemonic();
  const seedBuf = await mnemonicToSeed(mnemonic, "mnemonic" + password);
  const masterKey = HdKey.fromMasterSeed(seedBuf);
  return {
    mnemonic,
    xprv: masterKey.privateExtendedKey,
    xpub: masterKey.publicExtendedKey,
  };
};

export const getHdKeys = async (mnemonic, password) => {
  const seedBuf = await mnemonicToSeed(mnemonic, "mnemonic" + password);
  const masterKey = HdKey.fromMasterSeed(seedBuf);
  return {
    xprv: masterKey.privateExtendedKey,
    xpub: masterKey.publicExtendedKey,
  };
};

// renew
// extended keys must be of root (master) level
export const deriveKeys = (params, xprv, account, change, index) => {
  const hdKey = HdKey.fromExtendedKey(xprv);
  const childKeys = hdKey.derive(
    `m/${params.derivPurpose}'/${params.derivCoinType}'/${account}'/${change}/${index}`
  );
  return {
    xprv: childKeys.privateExtendedKey,
    xpub: childKeys.publicExtendedKey,
    secretKey: childKeys.privateKey.toString("hex"),
    publicKey: childKeys.publicKey.toString("hex"),
    chainCode: childKeys.chainCode.toString("hex"),
    address: getAddressFromPublicKey(
      params,
      childKeys.publicKey.toString("hex")
    ),
  };
};
