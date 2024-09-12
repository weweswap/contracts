import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

import addresses from "../deployments/chain-8453/deployed_addresses.json"

export default buildModule("FarmModule", m => {

	const CHAOS_ADDRESS = addresses["ChaosTokenModule#ChaosToken"];
	console.log("CHAOS_ADDRESS", CHAOS_ADDRESS);

	const farm = m.contract("Farm", [CHAOS_ADDRESS]);

	return { farm };
});
