import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// This gets reset so hard to use this on deploy
// import addresses from "../deployments/chain-8453/deployed_addresses.json"

export default buildModule("FarmModule", m => {
	// const CHAOS_ADDRESS = addresses["ChaosTokenModule#ChaosToken"] || "0xCb69EAaFE84D639021192398c1d2DB0d97AA13aA";
	const CHAOS_ADDRESS = "0xCb69EAaFE84D639021192398c1d2DB0d97AA13aA";
	const farm = m.contract("Farm", [CHAOS_ADDRESS]);

	return { farm };
});
