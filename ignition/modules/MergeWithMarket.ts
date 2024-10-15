import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ethers } from "ethers";

const WEWE_ADDRESS = "0x6b9bb36519538e0C073894E964E90172E1c0B41F";

export default buildModule("MergeModule", m => {
	const token = "0x9F235D23354857EfE6c541dB92a9eF1877689BCB";
	const vestingPeriod = 7; // in days
	const merge = m.contract("MergeWithMarket", [WEWE_ADDRESS, token, vestingPeriod]);

	return { merge };
});
