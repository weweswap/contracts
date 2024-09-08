import hre from "hardhat";
import { ethers } from "ethers";
import { USDC_ADDRESS } from "../test/constants";

const NonFungiblePositionManager = "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1";
const WEWE_ADDRESS = "0x6b9bb36519538e0C073894E964E90172E1c0B41F";
const SWAP_ROUTER_ADDRESS = "0x2626664c2603336E57B271c5C0b26F421741e481";
const fee = 500;

async function main() {
	await hre.run("verify:verify", {
		address: "0x0628582B3012e4fF74503f8B34dFfB67db01C4C0",
		constructorArguments: [NonFungiblePositionManager, SWAP_ROUTER_ADDRESS, ethers.ZeroAddress, WEWE_ADDRESS, USDC_ADDRESS, fee],
	});
}

main()
	.then(() => process.exit(0))
	.catch(async error => {
		console.error(error);
		process.exit(1);
	});
