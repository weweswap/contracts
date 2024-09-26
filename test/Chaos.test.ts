import { expect } from "chai";
import { ethers } from "hardhat";

import { DETERMINISTIC_MIN_HEIGHT } from "./constants";

describe("Chaos contract", () => {
	async function deployFixture() {
		// Reset the blockchain to a deterministic state
		await ethers.provider.send("hardhat_reset", [
			{
				forking: {
					jsonRpcUrl: process.env.FORKING_URL,
					blockNumber: DETERMINISTIC_MIN_HEIGHT,
				},
			},
		]);

		const Chaos = await ethers.getContractFactory("ChaosToken");
		const chaos = await Chaos.deploy();

		return { chaos };
	}

	describe("Chaos", () => {
		it("Should deploy the contract with correct params", async () => {
			const { chaos } = await deployFixture();

			expect(await chaos.name()).to.equal("CHAOS");
			expect(await chaos.symbol()).to.equal("CHAOS");
		});

		it("Should set farm address and mint", async () => {
			const { chaos } = await deployFixture();

			const chaosAddress = await chaos.getAddress();

			const Farm = await ethers.getContractFactory("Farm");
			const farm = await Farm.deploy(chaosAddress);

			const farmAddress = await farm.getAddress();

			await chaos.setFarm(farmAddress);
			expect(await chaos.balanceOf(farmAddress)).to.equal(1000000000000000000000000000n);

			await chaos.mint(1000);
			expect(await chaos.balanceOf(farmAddress)).to.equal(1000000000000000000000001000n);
		});
	});
});
