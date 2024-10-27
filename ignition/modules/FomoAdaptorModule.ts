import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("FomoAdaptorModule", m => {
	const fomo = m.contract("Fomo");

	return { fomo };
});
