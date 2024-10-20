import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const WEWE_ADDRESS = "0x6b9bb36519538e0C073894E964E90172E1c0B41F";
const VULT_IOU_ADDRESS = "0x299A57C1f6761b3dB304dc8B18bb4E60A1CF37b6";

export default buildModule("VultMergeModule", m => {
	const vestingPeriod = 7;
	const merge = m.contract("VultMerge", [WEWE_ADDRESS, VULT_IOU_ADDRESS, vestingPeriod]);

	return { merge };
});
