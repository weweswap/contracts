import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
	DETERMINISTIC_FEE0_AMOUNT,
	DETERMINISTIC_FEE1_AMOUNT,
	DETERMINISTIC_MIN_HEIGHT,
	DETERMINISTIC_OWED_TOKEN0_AMOUNT,
	DETERMINISTIC_OWED_TOKEN1_AMOUNT,
	DETERMINISTIC_TOKENID,
	DETERMINISTIC_WEWE_WETH_WALLET,
	DETERMINSITIC_LIQUIDITY,
} from "./constants";

const UNI_V3_POS = "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1";
const WEWE_ADDRESS = "0x6b9bb36519538e0C073894E964E90172E1c0B41F";
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const SWAP_ROUTER_ADDRESS = "0x2626664c2603336E57B271c5C0b26F421741e481";

describe("Chaos contract", function () {
	async function deployFixture() {
		const [owner, otherAccount] = await ethers.getSigners();
		// Reset the blockchain to a deterministic state
		await ethers.provider.send("hardhat_reset", [
			{
				forking: {
					jsonRpcUrl: process.env.FORKING_URL,
					blockNumber: DETERMINISTIC_MIN_HEIGHT,
				},
			},
		]);

		const accountWithFees = await ethers.getImpersonatedSigner(DETERMINISTIC_WEWE_WETH_WALLET);
		const transaction = await owner.sendTransaction({
			to: accountWithFees.address,
			value: ethers.parseEther("1.0"),
		});
		await transaction.wait();
		const Migration = await ethers.getContractFactory("Migration");

		const migration = await Migration.deploy(UNI_V3_POS, SWAP_ROUTER_ADDRESS, WEWE_ADDRESS, USDC_ADDRESS, 3000);

		return { migration, owner, otherAccount, accountWithFees };
	}

	describe("Configuration", function () {
		it("Should deploy the contract with correct addresses", async function () {
			// const { migration } = await loadFixture(deployFixture);
			// expect(await migration.nfpm()).to.equal(UNI_V3_POS);
		});
	});
});
