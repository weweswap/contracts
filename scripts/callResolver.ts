import { ethers } from "hardhat";
import { Wallet } from "ethers";

async function main() {
	const resolverAddr = "0x8512828605abC5c10d58254B25921E7a5735012c";
	const vaultAddr = "0xcf0b975641F29805520C66A0C2Abb55b0Df59b35";

	console.log("FORKING_URL", process.env.FORKING_URL);

	const [owner] = await ethers.getSigners();

	const block = await ethers.provider.getBlock("latest");
	console.log("block", block);

	const RESOLVER_ABI = [
		"function getMintAmounts(address vaultV2_, uint256 amount0Max_, uint256 amount1Max_) external view returns (uint256 amount0, uint256 amount1, uint256 mintAmount)",
	];

	const resolverContract = new ethers.Contract(resolverAddr, RESOLVER_ABI, owner);

	const amountToDeposit0 = ethers.parseEther("12000");
	const amountToDeposit1 = ethers.parseUnits("1", 6);

	const result = await resolverContract.getMintAmounts(vaultAddr, amountToDeposit0, amountToDeposit1);

	console.log("result", result);
}

// Ejecutar el script
main().catch(error => {
	console.error(error);
	process.exitCode = 1;
});
