import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("UniAdaptorModule", m => {
	const uni = m.contract("UniswapV3ViaRouterETH");

	return { uni };
});
