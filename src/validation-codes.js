const RESULT = {
	BK00: 0,
	BK01: 1,
	BK02: 2,
	BK03: 3,
	BK04: 4,
	BK05: 5,
	BK06: 25,
	TX00: 6,
	TX01: 7,
	TX02: 8,
	TX03: 9,
	TX04: 10,
	TX05: 11,
	TX06: 12,
	TX07: 13,
	TX08: 14,
	CB00: 15,
	CB01: 16,
	CB02: 17,
	CB03: 18,
	CB04: 19,
	CB05: 20,
	BC00: 21,
	BC01: 22,
	BC02: 23,
	VALID: 24,
};

const result = (code, args) => {
	switch (code) {
		case RESULT.BKOO:
			return { code, msg: "invalid height" };
		case RESULT.BK01:
			return { code, msg: "no version or timestamp" };
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
		case RESULT.BC00:
			return { code, msg: "invalid height w.r.t. previous block" };
		case RESULT.BC01:
			return { code, msg: "invalid timestamp w.r.t. previous block" };
		case RESULT.BC02:
			return { code, msg: "no genesis block" };
		case RESULT.VALID:
			return { code, msg: "valid!" };
	}
};

module.exports = { RESULT, result };
