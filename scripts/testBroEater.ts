import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

export async function main(broAddress: string, eaterAddress: string) {
	const privateKey = process.env.PK;

	if (!privateKey) {
		console.error("PK required!");
		process.exit(1);
	}

	const provider = new ethers.JsonRpcProvider(process.env.FORKING_URL);
	const wallet = new ethers.Wallet(privateKey, provider);

	const erc20Abi = [
		// Some minimal ABI that allows you to interact with the contract
		"function balanceOf(address owner) view returns (uint256)",
		"function transfer(address to, uint amount) returns (bool)",
		"function symbol() view returns (string)",
		"function approve(address spender, uint256 amount) external returns (bool)",
	];

	const erc20 = new ethers.Contract(broAddress, erc20Abi, wallet);
	const symbol = await erc20.symbol();
	console.log("symbol", symbol);

	const tx = await erc20.approve(eaterAddress, ethers.MaxUint256);
	await tx.wait();
}

if (require.main === module) {
	const broAddress = process.argv[2];
	const eaterAddress = process.argv[3];

	if (!broAddress) {
		console.error("Token address required!");
		process.exit(1);
	}

	if (!eaterAddress) {
		console.error("Eater address required!");
		process.exit(1);
	}

	main(broAddress, eaterAddress).catch(error => {
		console.error(error);
		process.exitCode = 1;
	});
}
