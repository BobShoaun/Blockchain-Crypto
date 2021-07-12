const RESULT = {
	BK00: 0,
	BK01: 1,
	BK02: 2,
	BK03: 3,
	BK04: 4,
	BK05: 5,
	BK06: 6,
	BK07: 7,

	TX00: 100,
	TX01: 101,
	TX02: 102,
	TX03: 103,
	TX04: 104,
	TX05: 105,
	TX06: 106,
	TX07: 107,
	TX08: 108,
	TX09: 109,

	CB00: 200,
	CB01: 201,
	CB02: 202,
	CB03: 203,
	CB04: 204,
	CB05: 205,
	CB06: 206,

	BC00: 300,
	BC01: 301,
	BC02: 302,
	BC03: 303,
	BC04: 304,

	VALID: 400,
};

const result = (code, args) => {
	switch (code) {
		case RESULT.BKOO:
			return { code, msg: "invalid height" };
		case RESULT.BK01:
			return { code, msg: "no version" };
		case RESULT.BK02:
			return { code, msg: "no transactions" };
		case RESULT.BK03:
			return { code, msg: "invalid hash" };
		case RESULT.BK04:
			return { code, msg: "invalid difficulty" };
		case RESULT.BK05:
			return { code, msg: `hash not within target of ${args[0]}` };
		case RESULT.BK06:
			return { code, msg: "invalid merkle root" };
		case RESULT.TX00:
			return { code, msg: "invalid inputs or outputs lengths" };
		case RESULT.TX01:
			return { code, msg: "invalid hash" };
		case RESULT.TX02:
			return { code, msg: "no version or timestamp" };
		case RESULT.TX03:
			return { code, msg: `input ${args[0]}:${args[1]} does not exist as a UTXO` };
		case RESULT.TX04:
			return { code, msg: "input has invalid public key" };
		case RESULT.TX05:
			return { code, msg: "output address invalid" };
		case RESULT.TX06:
			return { code, msg: `input is ${args[0]} and output is ${args[1]}` };
		case RESULT.TX07:
			return { code, msg: "more than one sender" };
		case RESULT.TX08:
			return { code, msg: "invalid signature" };
		case RESULT.TX09:
			return { code, msg: "output amount is negative or zero" };
		case RESULT.CB00:
			return { code, msg: "invalid hash" };
		case RESULT.CB01:
			return { code, msg: "no version or timestamp" };
		case RESULT.CB02:
			return { code, msg: "invalid input length" };
		case RESULT.CB03:
			return { code, msg: "invalid output length" };
		case RESULT.CB04:
			return { code, msg: "invalid miner address" };
		case RESULT.CB05:
			return { code, msg: `coinbase amt of ${args[0]} larger than actual ${args[1]}` };
		case RESULT.CB06:
			return { code, msg: "output amount is negative or zero" };
		case RESULT.BC00:
			return { code, msg: "invalid height w.r.t. previous block" };
		case RESULT.BC01:
			return { code, msg: "invalid timestamp w.r.t. previous block" };
		case RESULT.BC02:
			return { code, msg: "no genesis block" };
		case RESULT.BC03:
			return { code, msg: "previous block not within unconfirmed pool" };
		case RESULT.BC04:
			return { code, msg: "block already in unconfirmed pool (dupe)" };
		case RESULT.VALID:
			return { code, msg: "valid!" };
	}
};

module.exports = { RESULT, result };
