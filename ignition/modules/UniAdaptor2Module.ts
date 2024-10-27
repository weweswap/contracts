import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("UniAdaptor2Module", m => {
	const FOMO = "0xd327d36EB6E1f250D191cD62497d08b4aaa843Ce";
	const uni = m.contract("UniswapV3ViaRouter2", [FOMO]);

	return { uni };
});
