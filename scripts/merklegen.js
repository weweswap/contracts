const { StandardMerkleTree } = require("@openzeppelin/merkle-tree");
const fs = require("fs");

const genProof = (csvPath, outputPath) => {
	const csv = fs.readFileSync(csvPath, "utf-8");
	const lines = csv.split("\n").filter(Boolean);
	const whiteList = lines.map((line) => line.split(","));
	const tree = StandardMerkleTree.of(whiteList, ["address", "uint256"]);
	const rootHash = tree.root;

	console.log("Root hash:", rootHash);

	// const output = {
	// 	rootHash,
	// 	proofs: tree.elements.map((_, i) => tree.getProof(i))
	// };

	const output = [];

	for (const [i, v] of tree.entries()) {
		const proof = tree.getProof(i);
		console.log("Value:", v);
		console.log("Proof:", proof);

		output.push({
			value: v,
			proof: proof
		});
	}

	fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
	
	console.table(output);
	console.log("Proofs generated and saved to", outputPath);

}

genProof("./whitelist.csv", "whitelist.json");
