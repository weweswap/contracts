const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

const whiteList = [
	{
		address: "0x1234567890123456789012345678901234567890",
		amount: 1000
	},
    {
		address: "0x1234567890123456789012345678901234567891",
		amount: 500
	},
    {
		address: "0x1234567890123456789012345678901234567892",
		amount: 200
	}
];

const leaves = whiteList.map(({ address, amount }) => keccak256(address + amount));
const tree = new MerkleTree(leaves, keccak256);
const rootHash = tree.getRoot().toString("hex");

console.log(rootHash);

const proofs = [];

whiteList.forEach(({ address, amount }) => {
    const leaf = keccak256(address + amount);
    const proof = tree.getProof(leaf);
    const proofHex = proof.map((p) => p.data.toString("hex"));

    proofs.push({
        address,
        proofHex
    });

    console.log(`Proof for ${address}: ${proofHex}`);
});

console.log(proofs);