import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("BBroMergeModule", m => {
	const broMerge = m.contract("BBroMerge");

	// const rate = 3645;
	// m.call("broMerge", "setRate", BigInt(rate));

	return { broMerge };
});
