import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("LiquidityManagerModule", m => {
	const lm = m.contract("LiquidityManager");

	return { lm };
});
