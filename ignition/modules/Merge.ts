import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ethers } from "ethers";
import { WEWE_ADDRESS } from "../../test/constants";

const VULT_ADDRESS = ethers.ZeroAddress;

export default buildModule("MergeModule", m => {
	const merge = m.contract("Merge", [WEWE_ADDRESS, VULT_ADDRESS]);

	return { merge };
});
