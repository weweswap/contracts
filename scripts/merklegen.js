const { StandardMerkleTree } = require("@openzeppelin/merkle-tree");

const whiteList = [
	["0x70997970C51812dc3A010C7d01b50e0d17dc79C8", "1000"],
	["0x1234567890123456789012345678901234567891", "500"],
	["0x1234567890123456789012345678901234567892", "200"]
];

const tree2 = StandardMerkleTree.of(whiteList, ["address", "uint256"]);
const rootHash2 = tree2.root;

console.log("Root hash 2: ", rootHash2);

for (const [i, v] of tree2.entries()) {
	const proof = tree2.getProof(i);
	console.log("Value:", v);
	console.log("Proof:", proof);
}
