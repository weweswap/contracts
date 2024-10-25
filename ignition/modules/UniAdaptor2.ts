import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("UniswapV3ViaRouterGoodleModule", m => {
	const FOMO = "0xd327d36EB6E1f250D191cD62497d08b4aaa843Ce";
	const uni = m.contract("UniswapV3ViaRouter2", [FOMO]);

	return { uni };
});
