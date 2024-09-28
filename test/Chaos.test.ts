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
			expect(await chaos.decimals()).to.equal(18);
		});

		it("Should increment allowance", async () => {
			const { chaos } = await deployFixture();

			const [owner, spender] = await ethers.getSigners();
			expect(await chaos.allowance(owner.address, spender.address)).to.equal(0);

			await chaos.approve(spender.address, 100);
			expect(await chaos.allowance(owner.address, spender.address)).to.equal(100);
		});

		it("Should reset increament allowance", async () => {
			const { chaos } = await deployFixture();

			const [owner, spender] = await ethers.getSigners();
			expect(await chaos.allowance(owner.address, spender.address)).to.equal(0);

			await chaos.approve(spender.address, 100);
			expect(await chaos.allowance(owner.address, spender.address)).to.equal(100);

			await chaos.approve(spender.address, 0);
			expect(await chaos.allowance(owner.address, spender.address)).to.equal(0);
		});

		it("Should not allow spender to spend more than allowance", async () => {
			const { chaos } = await deployFixture();

			const [owner, spender] = await ethers.getSigners();
			await chaos.mint(1000);

			expect(await chaos.balanceOf(owner.address)).to.equal(1000);
			expect(await chaos.totalSupply()).to.equal(1000);
			expect(await chaos.allowance(owner.address, spender.address)).to.equal(0);

			expect(chaos.connect(spender).transferFrom(owner.address, spender.address, 100)).to.be.revertedWith("CHAOS: transfer amount exceeds allowance");

			await expect(chaos.approve(spender.address, 100)).to.emit(chaos, "Approval");
			expect(await chaos.allowance(owner.address, spender.address)).to.equal(100);

			await expect(chaos.connect(spender).transferFrom(owner.address, spender.address, 1000)).to.be.revertedWith(
				"CHAOS: transfer amount exceeds allowance",
			);

			expect(await chaos.connect(spender).transferFrom(owner.address, spender.address, 100))
				.to.emit(chaos, "Transfer")
				.withArgs(owner.address, spender.address, 100);

			expect(await chaos.balanceOf(owner.address)).to.equal(900);
			expect(await chaos.balanceOf(spender.address)).to.equal(100);
		});

		it("Should allow transfer from owner to another address", async () => {
			const { chaos } = await deployFixture();

			const [owner, receiver] = await ethers.getSigners();
			await chaos.mint(1000);

			expect(await chaos.balanceOf(owner.address)).to.equal(1000);
			expect(await chaos.totalSupply()).to.equal(1000);

			await expect(chaos.transfer(receiver.address, 2000)).to.be.revertedWith("CHAOS: transfer amount exceeds balance");

			await chaos.transfer(receiver.address, 100);

			expect(await chaos.balanceOf(owner.address)).to.equal(900);
			expect(await chaos.balanceOf(receiver.address)).to.equal(100);
		});

		it("Should set farm address and mint", async () => {
			const { chaos } = await deployFixture();

			const chaosAddress = await chaos.getAddress();

			const Farm = await ethers.getContractFactory("Farm");
			const farm = await Farm.deploy(chaosAddress);

			const farmAddress = await farm.getAddress();

			await chaos.setFarm(farmAddress);
			expect(await chaos.balanceOf(farmAddress)).to.equal(1000000000000000000000000000n);

			await chaos.mintToFarm(1000);
			expect(await chaos.balanceOf(farmAddress)).to.equal(1000000000000000000000001000n);
		});
	});
});
