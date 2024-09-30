import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ChaosTokenModule", m => {
	const chaos = m.contract("CHAOS");

	return { chaos };
});
