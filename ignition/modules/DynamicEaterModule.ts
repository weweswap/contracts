import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ethers } from "ethers";

const WEWE_ADDRESS = "0x6b9bb36519538e0C073894E964E90172E1c0B41F";
// Boomer Token https://basescan.org/address/0xcdE172dc5ffC46D228838446c57C1227e0B82049
const TOKEN = "0xcdE172dc5ffC46D228838446c57C1227e0B82049";

export default buildModule("DynamicEaterModule", m => {
	const vestingPeriod = 3 * 1440;
	const weweVirtualBalance = ethers.parseUnits("160000000", 18);
	const tokenVirtualBalance = ethers.parseUnits("1300000", 18);
	const merge = m.contract("DynamicEater", [WEWE_ADDRESS, TOKEN, vestingPeriod, tokenVirtualBalance, weweVirtualBalance]);

	return { merge };
});
