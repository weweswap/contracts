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
		"function allowance(address owner, address spender) external view returns (uint256)",
	];

	const bro = new ethers.Contract(broAddress, erc20Abi, wallet);
	const symbol = await bro.symbol();
	console.log("symbol", symbol);

	const allowance = await bro.allowance(wallet.address, eaterAddress);
	if (allowance === 0) {
		//	If we need to approve the eater contract
		const tx = await bro.approve(eaterAddress, ethers.MaxUint256);
		await tx.wait();
	}

	console.log("Approved", eaterAddress);

	// Check if bro is in the eater contract
	const balance = await bro.balanceOf(eaterAddress);
	console.log("Balance", ethers.formatUnits(balance, 18));

	if (balance > 0) {
		console.log("Bro is in the eater contract");
		return;
	}

	const tx = await bro.transfer(eaterAddress, ethers.parseUnits("1", 18));
	await tx.wait();

	console.log("Transferred 1 BRO to", eaterAddress);
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
