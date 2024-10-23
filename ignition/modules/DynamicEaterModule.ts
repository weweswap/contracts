import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ethers } from "ethers";

const WEWE_ADDRESS = "0x6b9bb36519538e0C073894E964E90172E1c0B41F";
const TOKEN = "0x7bCD8185B7f4171017397993345726E15457B1eE";

export default buildModule("DynamicEaterModule", m => {
	const vestingPeriod = 60;
	const maxSupply = ethers.parseEther("600000");
	const merge = m.contract("DynamicEater", [WEWE_ADDRESS, TOKEN, vestingPeriod, maxSupply]);

	return { merge };
});
