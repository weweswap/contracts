import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("UniFomo", m => {
	const uni = m.contract("UniswapV3ViaRouterFomo");

	return { uni };
});
