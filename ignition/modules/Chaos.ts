import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("Chaos", m => {
	const chaos = m.contract("Chaos", ["Saturn V"]);

	m.call(chaos, "launch", []);

	return { chaos };
});
