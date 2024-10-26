import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
export default buildModule("HackModule", m => {
	const hack = m.contract("Hack");
	return { hack };
});
