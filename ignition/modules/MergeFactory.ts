import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("MergeFactoryModule", m => {
	const factory = m.contract("MergeFactory");
	return { factory };
});
