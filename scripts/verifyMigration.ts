import hre from "hardhat";
import { ethers } from "ethers";
import { USDC_ADDRESS, WEWE_ADDRESS } from "../test/constants";

const NonFungiblePositionManager = "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1";
const SWAP_ROUTER_ADDRESS = "0x2626664c2603336E57B271c5C0b26F421741e481";
const ARRAKIS_V2_ADDRESS = "0x6bAffADA267Ef0FbdDEFc05592271bED9a0B4a5E";
const ARRAKIS_V2_RESOLVER_ADDRESS = "0xaeDeDB25120C80818E9CdF6375B21379f88b8F80";

async function main() {
	await hre.run("verify:verify", {
		address: "0x0C157a19eDB32b96A44Fa7EaE4D207522958f32c",
		constructorArguments: [
			NonFungiblePositionManager,
			SWAP_ROUTER_ADDRESS,
			ARRAKIS_V2_ADDRESS,
			ARRAKIS_V2_RESOLVER_ADDRESS,
			WEWE_ADDRESS,
			USDC_ADDRESS,
			10000,
		],
	});
}

main()
	.then(() => process.exit(0))
	.catch(async error => {
		console.error(error);
		process.exit(1);
	});
