import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

import { WEWE_ADDRESS } from "../../test/constants";

export default buildModule("BroEater", m => {
	const eater = m.contract("BroEater", [WEWE_ADDRESS]);

	return { eater };
});
