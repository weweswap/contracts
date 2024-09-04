import { ethers } from "hardhat";

enum PoolType {
	Stable,
	BlueChip,
	SmallCap,
}

type PoolConfiguration = {
	targetPriceDelta: number;
	narrowRange: number;
	midRange: number;
	wideRange: number;
	fee: number;
};

export async function main(lmAddress: string, poolType: PoolType, configuration: PoolConfiguration) {
	const LiquidityManagerFactory = await ethers.getContractAt("LiquidityManagerFactory", lmAddress);
	const tx = await LiquidityManagerFactory.setPoolConfiguration(poolType, configuration);
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
	const poolType = Number(process.argv[3]);
	const targetPriceDelta = Number(process.argv[4]);
	const narrowRange = Number(process.argv[5]);
	const midRange = Number(process.argv[6]);
	const wideRange = Number(process.argv[7]);
	const fee = Number(process.argv[8]);

	if (!lmAddress) {
		console.error("Liquidity manager factory address required!");
		process.exit(1);
	}

	if (!poolType) {
		console.error("Pool type required!");
		process.exit(1);
	}

	main(lmAddress, getPoolType(Number(poolType)), { targetPriceDelta, narrowRange, midRange, wideRange, fee }).catch(error => {
		console.error(error);
		process.exitCode = 1;
	});
}
