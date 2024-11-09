const { StandardMerkleTree } = require("@openzeppelin/merkle-tree");
const fs = require("fs");
const ethers = require("ethers");

const genProof = (csvPath, decimals, outputPath) => {
	const csv = fs.readFileSync(csvPath, "utf-8");
	const lines = csv.split("\n").filter(Boolean);
	const whiteList = [];

	for (let i = 0; i < lines.length; i++) {
		
		// use regex to split by comma, but ignore commas within quotes
		const row = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);

		let address = row[0];
		// remove quotes
		address = address.replace(/"/g, '');

		// test if address is valid using ethers
		if (!ethers.isAddress(address)) {
			console.log("Invalid address:", address);
			continue;
		}

		let amount = row[1];

		// remove commas
		amount = amount.replace(/,/g, "");

		// remove quotes
		amount = amount.replace(/"/g, "");

		if (isNaN(amount)) {
			console.log("Invalid amount:", amount);
			continue;
		}

		if (amount < 1400) {
			console.log("Amount must be an integer:", amount);
			continue;
		}

		// convert amount to wei
		const amountAsBigInt = ethers.parseUnits(amount, decimals);

		whiteList[i] = [address, amountAsBigInt.toString()];
	}


	const tree = StandardMerkleTree.of(whiteList, ["address", "uint256"]);
	const rootHash = tree.root;

	console.log("Root hash:", rootHash);
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

// genProof("./whitelist.csv", "whitelist.json");
genProof("./scripts/csvs/boomer.csv", 18, "boomer.json");
