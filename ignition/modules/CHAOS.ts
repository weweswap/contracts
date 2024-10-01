import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ChaosModule", m => {
	const chaos = m.contract("CHAOS");

	return { chaos };
});
