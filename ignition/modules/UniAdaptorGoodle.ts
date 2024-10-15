import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("UniswapV3ViaRouterGoodleModule", m => {
	const uni = m.contract("UniswapV3ViaRouterGoodle");

	return { uni };
});
