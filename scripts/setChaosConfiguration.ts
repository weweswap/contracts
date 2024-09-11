import { ethers } from "hardhat";

export async function main(tokenAddress: string, farmAddress: string) {
	const ChaosToken = await ethers.getContractAt("ChaosToken", tokenAddress);
	const farm_tx = await ChaosToken.setFarm(farmAddress);
	await farm_tx.wait();

	// https://app.ens.domains/jpthor.base.eth
	const JP_ADDRESS = "0x58E03d622a88b4012ee0a97235C6b110077FB867";
	const tx = await ChaosToken.transferOwnership(JP_ADDRESS);
	await tx.wait();
}

if (require.main === module) {
	const tokenAddress = process.argv[2];
	const farmAddress = process.argv[3];

	if (!tokenAddress) {
		console.error("Chaos address required!");
		process.exit(1);
	}

	if (!farmAddress) {
		console.error("Farm address required!");
		process.exit(1);
	}

	main(tokenAddress, farmAddress).catch(error => {
		console.error(error);
		process.exitCode = 1;
	});
}
