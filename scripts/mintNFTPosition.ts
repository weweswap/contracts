import { ethers } from "hardhat";
import { WEWE_ADDRESS } from "../test/constants";

const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";
const NonFungiblePositionManager = "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1";
const UniswapV3Factory = "0x33128a8fC17869897dcE68Ed026d694621f6FDfD";

import { main as getAssetFromEth } from "./getAssetFromEth";

export async function main(owner: string, asset?: string) {
	const [deployer] = await ethers.getSigners();
	await getAssetFromEth(deployer.address, asset);
	const UniswapFactory = await ethers.getContractAt("IUniswapV3Factory", UniswapV3Factory);

	const poolAddress = await UniswapFactory.getPool(WETH_ADDRESS, asset || WEWE_ADDRESS, 10000);
	if (poolAddress === ethers.ZeroAddress) {
		console.error("The pool does not exist. You must create the pool first");
		return;
	}

	const MintNftPositionFactory = await ethers.getContractFactory("MintNftPosition");
	const mintNftPosition = await MintNftPositionFactory.deploy(asset || WEWE_ADDRESS, poolAddress, NonFungiblePositionManager);
	await mintNftPosition.waitForDeployment();

	const amountToDeposit0 = ethers.parseEther("0.1");
	const amountToDeposit1 = ethers.parseEther("35000");

	const wethContract = await ethers.getContractAt("IERC20", WETH_ADDRESS, deployer);
	const weweContract = await ethers.getContractAt("IERC20", asset || WEWE_ADDRESS, deployer);

	await wethContract.approve(await mintNftPosition.getAddress(), amountToDeposit0);
	await weweContract.approve(await mintNftPosition.getAddress(), amountToDeposit1);

	const tx = await mintNftPosition.connect(deployer).mintNewPosition(amountToDeposit0, amountToDeposit1, owner);
	await tx.wait();
}

if (require.main === module) {
	const owner = process.argv[2];
	const asset = process.argv[3];

	if (!owner) {
		console.error("Owner required");
		process.exit(1);
	}

	main(owner, asset).catch(error => {
		console.error(error);
		process.exitCode = 1;
	});
}
