import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ChaosTokenModule", m => {
	const chaosToken = m.contract("ChaosToken");

	return { chaosToken };
});
