import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const WEWE_ADDRESS = "0x6b9bb36519538e0C073894E964E90172E1c0B41F";
const GOODLE_ADDRESS = "0x9F235D23354857EfE6c541dB92a9eF1877689BCB";

export default buildModule("MergeModule", m => {
	const vestingPeriod = 7;
	const merge = m.contract("MergeWithMarket", [WEWE_ADDRESS, GOODLE_ADDRESS, vestingPeriod]);

	return { merge };
});
