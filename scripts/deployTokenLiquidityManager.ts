import { ethers } from "hardhat";

enum PoolType {
	Stable,
	BlueChip,
	SmallCap,
}

export async function main(lmAddress: string, token: string, poolType: PoolType) {
	const LiquidityManagerFactory = await ethers.getContractAt("LiquidityManagerFactory", lmAddress);

	const tx = await LiquidityManagerFactory.deployLiquidityManager(token, poolType);
	await tx.wait();
}

const getPoolType = (type: number): PoolType => {
	switch (type) {
		case 0:
			return PoolType.Stable;
		case 1:
			return PoolType.BlueChip;
		case 2:
			return PoolType.SmallCap;
	}
	throw Error("Unknown pool type");
};

if (require.main === module) {
	const lmAddress = process.argv[2];
	const token = process.argv[3];
	const poolType = process.argv[4];

	if (!lmAddress) {
		console.error("Liquidity manager factory address required!");
		process.exit(1);
	}

	if (!token) {
		console.error("Token address required!");
		process.exit(1);
	}

	if (!poolType) {
		console.error("Pool type required!");
		process.exit(1);
	}

	main(lmAddress, token, getPoolType(Number(poolType)))
		.catch(error => {
			console.error(error);
			process.exitCode = 1;
		})
		.then(configuration => console.log(configuration));
}
