import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const WEWE_ADDRESS = "0x6b9bb36519538e0C073894E964E90172E1c0B41F";

export default buildModule("BroEater", m => {
	const eater = m.contract("BroEater", [WEWE_ADDRESS]);

	return { eater };
});
