import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ethers } from "ethers";
import { USDC_ADDRESS } from "../../test/constants";

const NonFungiblePositionManager = "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1";
const WEWE_ADDRESS = "0x6b9bb36519538e0C073894E964E90172E1c0B41F";
const SWAP_ROUTER_ADDRESS = "0x2626664c2603336E57B271c5C0b26F421741e481";

export default buildModule("MigrationModule", m => {
	const fee = 500;
	const migration = m.contract("Migration", [NonFungiblePositionManager, SWAP_ROUTER_ADDRESS, ethers.ZeroAddress, WEWE_ADDRESS, USDC_ADDRESS, fee]);

	return { migration };
});
