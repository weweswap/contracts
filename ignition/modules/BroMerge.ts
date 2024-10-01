import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ethers } from "ethers";

export default buildModule("BroMergeModule", m => {
	const broMerge = m.contract("BroMerge");

	return { broMerge };
});
