import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ChaosModule", m => {
	const chaosToken = m.contract("CHAOS");

	return { chaosToken };
});
