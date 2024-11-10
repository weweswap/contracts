import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ethers } from "ethers";

const WEWE_ADDRESS = "0x6b9bb36519538e0C073894E964E90172E1c0B41F";
// Boomer Token
const TOKEN = "0xa926342d7f9324A1DbDe8F5ab77c92706f289b5d";

export default buildModule("DynamicEaterModule", m => {
	const vestingPeriod = 3 * 1440;
	const weweVirtualBalance = ethers.parseUnits("160000000", 18);
	const tokenVirtualBalance = ethers.parseUnits("1300000", 18);
	const merge = m.contract("DynamicEater", [WEWE_ADDRESS, TOKEN, vestingPeriod, tokenVirtualBalance, weweVirtualBalance]);

	return { merge };
});
