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
	USDC_ADDRESS,
} from "./constants";

const WEWE_ADDRESS = "0x6b9bb36519538e0C073894E964E90172E1c0B41F";
const REWARDER_ADDRESS = ethers.ZeroAddress;

describe.only("Chaos contract", function () {
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
		// const transaction = await owner.sendTransaction({
		// 	to: accountWithFees.address,
		// 	value: ethers.parseEther("1.0"),
		// });
		// await transaction.wait();

		const Farm = await ethers.getContractFactory("Farm");
		const farm = await Farm.deploy(ethers.ZeroAddress, USDC_ADDRESS);

		return { farm, owner, otherAccount, accountWithFees };
	}

	describe("Chaos", () => {
		it("Should deploy the contract with correct addresses", async () => {
			const { farm } = await loadFixture(deployFixture);
			expect(await farm.CHAOS()).to.equal(ethers.ZeroAddress);
			expect(await farm.CHAOS_TOKEN()).to.equal(USDC_ADDRESS);
			expect(await farm.poolLength()).to.equal(0);
			expect(await farm.rewardsPerBlock()).to.equal(0);
		});

		// it("Should init dummy (USDC) token", async () => {
		// 	const { farm } = await loadFixture(deployFixture);
		// 	const tx = await farm.init("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913");
		// 	await tx.wait();
		// });

		it("Should add pool", async () => {
			const { farm } = await loadFixture(deployFixture);

			// todo: get alloc point
			const allocPoint = 0;
			expect(await farm.add(allocPoint, USDC_ADDRESS, REWARDER_ADDRESS)).to.emit(farm, "LogPoolAddition");
		});

		it.only("Should set and overwrite alloc point", async () => {
			const { farm } = await loadFixture(deployFixture);
			const poolId = 0;
			const allocPoint = 0;

			expect(await farm.set(poolId, allocPoint, REWARDER_ADDRESS, true)).to.emit(farm, "LogSetPool");
		});

		describe("Migrator", () => {
			it("Should set migrator", async () => {
				const { farm } = await loadFixture(deployFixture);

				expect(await farm.migrator()).to.not.equal(ethers.ZeroAddress);

				const newMigrator = ethers.ZeroAddress;
				await farm.setMigrator(newMigrator);
				expect(await farm.migrator()).to.equal(ethers.ZeroAddress);
			});

			it("Should not migrator if migrator not set", async () => {
				const { farm } = await loadFixture(deployFixture);

				// set migrator to non zero address

				expect(await farm.migrator()).to.not.equal(ethers.ZeroAddress);

				// todo: test this
			});

			it("Should migrate", async () => {
				const { farm } = await loadFixture(deployFixture);
				expect(await farm.migrator()).to.not.equal(ethers.ZeroAddress);

				await farm.migrate(0);
			});
		});

		it("Should get no pending rewards", async () => {
			const { farm } = await loadFixture(deployFixture);
			const poolId = 0;
			const account = ethers.Wallet.createRandom().address;
			expect(await farm.pendingRewards(poolId, account)).to.equal(0);
		});

		describe("Deposit and withdraw", () => {
			let _chaos: any;

			this.beforeEach(async () => {
				const { farm } = await loadFixture(deployFixture);
				_chaos = farm;
				const poolId = 0;
				const allocPoint = 0;
				await _chaos.add(allocPoint, USDC_ADDRESS, REWARDER_ADDRESS);
				await _chaos.set(poolId, allocPoint, REWARDER_ADDRESS, true);
			});

			it("Should deposit", async () => {
				const poolId = 0;
				const account = ethers.Wallet.createRandom().address;

				expect(await _chaos.deposit(poolId, 1000000n, account))
					.to.emit(_chaos, "Deposit")
					.withArgs(account, poolId, 1000000n);
			});

			it("Should withdraw", async () => {
				const { farm } = await loadFixture(deployFixture);

				const poolId = 0;
				const account = ethers.Wallet.createRandom().address;

				const tx = await farm.withdraw(poolId, 1000000n, account);
				await tx.wait();
			});
		});

		it("Should harvest", async () => {
			const { farm } = await loadFixture(deployFixture);

			const poolId = 0;
			const account = ethers.Wallet.createRandom().address;

			await farm.harvest(poolId, account);
		});

		it("Should withdraw and harvest", async () => {
			const { farm } = await loadFixture(deployFixture);

			const poolId = 0;
			const account = ethers.Wallet.createRandom().address;

			await farm.withdrawAndHarvest(poolId, 1000000n, account);
		});

		it("Should emergency withdraw", async () => {
			const { farm } = await loadFixture(deployFixture);
			const poolId = 0;
			const account = ethers.Wallet.createRandom().address;

			await farm.emergencyWithdraw(poolId, account);
		});
	});
});
