import { generateVanityAddress } from "../../index.js";
import params from "./params.js";

// const regex = /^[8,9]b[0,o,O]b/i;
// const regex = /^[8,9]hell[0,o,O]/i;
// const regex = /^[8,9][p,P][0,o,O][0,o,O][l,L,1]/i;
// const regex = /^.[p,P][o,0,O][o,0,O][l,i,1,L]/i;
// const regex = /^.[p,P][o,0,O][o,O,0]/i;

// const regex = /^.n[o0O]d[e3]/i;
const regex = /^.[nN]ode/;
const limit = 1000000;

let keys = null;
for (keys of generateVanityAddress(params, regex, limit)) {
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  process.stdout.write(keys.address);
}
process.stdout.clearLine();
process.stdout.cursorTo(0);
console.log(keys);
