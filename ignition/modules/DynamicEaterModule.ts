import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ethers } from "ethers";

const WEWE_ADDRESS = "0x6b9bb36519538e0C073894E964E90172E1c0B41F";
const TOKEN = "0xd327d36EB6E1f250D191cD62497d08b4aaa843Ce";

export default buildModule("DynamicEaterModule", m => {
	const vestingPeriod = 60;
	const maxSupply = ethers.parseUnits("600000", 9);
	const merge = m.contract("DynamicEater", [WEWE_ADDRESS, TOKEN, vestingPeriod, maxSupply]);

	return { merge };
});
