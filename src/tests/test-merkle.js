const SHA256 = require("crypto-js/sha256");
const { calculateMerkleRoot } = require("../mine");

console.log(calculateMerkleRoot(["hello", "world", "foo", "bar"]));
//same as
console.log(SHA256(SHA256("helloworld") + SHA256("foobar")).toString());

console.log(calculateMerkleRoot(["hello", "world", "foo", "bar", "baz"]));
//same as
console.log(
	SHA256(
		SHA256(SHA256("helloworld") + SHA256("foobar")) + SHA256(SHA256("bazbaz") + SHA256("bazbaz"))
	).toString()
);

console.log(calculateMerkleRoot(["hello", "world", "foo", "bar", "baz", "boo"]));
//same as
console.log(
	SHA256(
		SHA256(SHA256("helloworld") + SHA256("foobar")) + SHA256(SHA256("bazboo") + SHA256("bazboo"))
	).toString()
);
