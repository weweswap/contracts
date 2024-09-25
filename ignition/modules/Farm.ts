import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// import addresses from "../deployments/chain-8453/deployed_addresses.json"

export default buildModule("FarmModule", m => {
	const CHAOS_ADDRESS = "0xf901F4ec62590231f374cA7C5d34BbcA49B11d6B";
	const farm = m.contract("Farm", [CHAOS_ADDRESS]);

	return { farm };
});
