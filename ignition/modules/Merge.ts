import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ethers } from "ethers";

const WEWE_ADDRESS = "0x6b9bb36519538e0C073894E964E90172E1c0B41F";
const VULT_ADDRESS = ethers.ZeroAddress;

export default buildModule("MergeModule", m => {
	const merge = m.contract("Merge", [WEWE_ADDRESS, VULT_ADDRESS]);

	return { merge };
});
