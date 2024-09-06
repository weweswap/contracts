import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ethers } from "ethers";
import { USDC_ADDRESS } from "../../test/constants";

const NonFungiblePositionManager = "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1";
const WEWE_ADDRESS = "0x6b9bb36519538e0C073894E964E90172E1c0B41F";
const SWAP_ROUTER_ADDRESS = ethers.ZeroAddress;

export default buildModule("MigrationModule", m => {
	const fee = 500;
	const migration = m.contract("Migration", [NonFungiblePositionManager, SWAP_ROUTER_ADDRESS, WEWE_ADDRESS, USDC_ADDRESS, fee]);

	return { migration };
});
