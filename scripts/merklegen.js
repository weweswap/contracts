const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
const { StandardMerkleTree } = require("@openzeppelin/merkle-tree");

// const whiteList = [
// 	{
// 		address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
// 		amount: "1000"
// 	},
//     {
// 		address: "0x1234567890123456789012345678901234567891",
// 		amount: "500"
// 	},
//     {
// 		address: "0x1234567890123456789012345678901234567892",
// 		amount: "200"
// 	}
// ];

const whiteList = [
	["0x70997970C51812dc3A010C7d01b50e0d17dc79C8", "1000"],
	["0x1234567890123456789012345678901234567891", "500"],
	["0x1234567890123456789012345678901234567892", "200"]
];

const leaves = whiteList.map(({ address, amount }) => keccak256(address + amount));
const tree = new MerkleTree(leaves, keccak256);
const rootHash1 = tree.getRoot().toString("hex");

// console.log("Root hash 1: ", rootHash1);

const proofs = [];

// whiteList.forEach(({ address, amount }) => {
//     const leaf = keccak256(address + amount);
//     console.log(`Leaf for ${address}: ${leaf.toString("hex")}`);
//     const proof = tree.getProof(leaf);
//     const proofHex = proof.map((p) => p.data.toString("hex"));

//     proofs.push({
//         address,
//         proofHex
//     });

//     console.log(`Proof for ${address}: ${proofHex}`);
// });

const tree2 = StandardMerkleTree.of(whiteList, ["address", "uint256"]);
const rootHash2 = tree2.root;

console.log("Root hash 2: ", rootHash2);

// console.log(proofs);

for (const [i, v] of tree2.entries()) {
	const proof = tree2.getProof(i);
	console.log("Value:", v);
	console.log("Proof:", proof);
}
