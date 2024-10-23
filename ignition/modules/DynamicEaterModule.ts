import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ethers } from "ethers";

const WEWE_ADDRESS = "0x6b9bb36519538e0C073894E964E90172E1c0B41F";
const VULT_IOU_ADDRESS = "0x299A57C1f6761b3dB304dc8B18bb4E60A1CF37b6";

export default buildModule("DynamicEaterModule", m => {
	const vestingPeriod = 60;
	const maxSupply = ethers.parseEther("100");
	const merge = m.contract("DynamicEater", [WEWE_ADDRESS, VULT_IOU_ADDRESS, vestingPeriod, maxSupply]);

	return { merge };
});
