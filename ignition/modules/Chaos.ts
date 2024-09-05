import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ethers } from "ethers";

const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const CHAOS_ADDRESS = ethers.ZeroAddress;

export default buildModule("Chaos", m => {
	const chaos = m.contract("Chaos", [CHAOS_ADDRESS, USDC_ADDRESS]);

	m.call(chaos, "launch", []);

	return { chaos };
});
