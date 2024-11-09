const { StandardMerkleTree } = require("@openzeppelin/merkle-tree");
const fs = require("fs");
const ethers = require("ethers");

const genProof = (csvPath, decimals, outputPath) => {
	const csv = fs.readFileSync(csvPath, "utf-8");
	const lines = csv.split("\n").filter(Boolean);
	const whiteList = [];

	for (let i = 0; i < lines.length; i++) {
		try {
			// use regex to split by comma, but ignore commas within quotes
			const row = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);

			let address = row[0];
			// remove quotes
			address = address.replace(/"/g, "");

			// test if address is valid using ethers
			if (!ethers || !ethers.isAddress(address)) {
				console.log("Invalid address:", address);
				continue;
			}

			let amount = row[1];
			if (!amount) {
				console.log("Invalid amount: ", amount);
				continue;
			}

			// remove commas
			amount = amount.replace(/,/g, "");

			// remove quotes
			amount = amount.replace(/"/g, "");

			if (isNaN(amount)) {
				console.log("Invalid amount:", amount);
				continue;
			}

			// convert amount to wei
			console.log("Amount:", amount);
			const amountAsBigInt = ethers.parseUnits(amount, decimals);

			if (amountAsBigInt > ethers.parseUnits("140", decimals)) {
				whiteList[i] = [address, amountAsBigInt.toString()];
			}
		} catch (e) {
			console.log("Error at line", i + 1, ":", e);
		}
	}

	const output = [];
	try {
		const tree = StandardMerkleTree.of(whiteList, ["address", "uint256"]);
		const rootHash = tree.root;

		console.log("Root hash:", rootHash);

		for (const [i, v] of tree.entries()) {
			const proof = tree.getProof(i);
			console.log("Value:", v);
			console.log("Proof:", proof);

			output.push({
				value: v,
				proof: proof
			});
		}
	} catch (e) {
		console.log("Error:", e);
	}

	fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

	console.table(output);
	console.log("Proofs generated and saved to", outputPath);
};

// genProof("./whitelist.csv", "whitelist.json");
genProof("./scripts/csvs/boomer.csv", 18, "boomer.json");
