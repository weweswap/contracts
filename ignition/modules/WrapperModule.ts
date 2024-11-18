import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("WrapperModule", m => {
	const factory = "0x7Af5148b733354FC25eAE912Ad5189e0E0a90670";
	const wrapper = m.contract("Wrapper", [factory]);

	return { wrapper };
});
