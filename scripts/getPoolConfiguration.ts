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

export async function main(lmAddress: string, poolType: PoolType): Promise<PoolConfiguration> {
	const LiquidityManagerFactory = await ethers.getContractAt("LiquidityManagerFactory", lmAddress);
	const configuration = await LiquidityManagerFactory.getPoolConfiguration(poolType);

	return {
		targetPriceDelta: Number(configuration[0]),
		narrowRange: Number(configuration[1]),
		midRange: Number(configuration[2]),
		wideRange: Number(configuration[3]),
		fee: Number(configuration[4]),
	};
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

	if (!lmAddress) {
		console.error("Liquidity manager factory address required!");
		process.exit(1);
	}

	if (!poolType) {
		console.error("Pool type required!");
		process.exit(1);
	}

	main(lmAddress, getPoolType(Number(poolType)))
		.catch(error => {
			console.error(error);
			process.exitCode = 1;
		})
		.then(configuration => console.log(configuration));
}
