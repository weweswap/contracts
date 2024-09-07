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

		const Chaos = await ethers.getContractFactory("Chaos");
		const chaos = await Chaos.deploy(ethers.ZeroAddress, USDC_ADDRESS, 1);

		return { chaos, owner, otherAccount, accountWithFees };
	}

	describe("Chaos", () => {
		it("Should deploy the contract with correct addresses", async () => {
			const { chaos } = await loadFixture(deployFixture);
			expect(await chaos.CHAOS()).to.equal(ethers.ZeroAddress);
			expect(await chaos.CHAOS_TOKEN()).to.equal(USDC_ADDRESS);
			expect(await chaos.MASTER_PID()).to.equal(1);
			expect(await chaos.poolLength()).to.equal(0);
			expect(await chaos.rewardsPerBlock()).to.equal(0);
		});

		it("Should init dummy (USDC) token", async () => {
			const { chaos } = await loadFixture(deployFixture);
			const tx = await chaos.init("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913");
			await tx.wait();
		});

		it("Should add pool", async () => {
			const { chaos } = await loadFixture(deployFixture);

			// tood: get alloc point
			const allocPoint = 0;
			expect(await chaos.add(allocPoint, USDC_ADDRESS, REWARDER_ADDRESS)).to.emit(chaos, "LogPoolAddition");
		});

		it("Should set and overwrite alloc point", async () => {
			const { chaos } = await loadFixture(deployFixture);
			const poolId = 0;
			const allocPoint = 0;

			expect(await chaos.set(poolId, allocPoint, REWARDER_ADDRESS, true)).to.emit(chaos, "LogSetPool");
		});

		describe("Migrator", () => {
			it("Should set migrator", async () => {
				const { chaos } = await loadFixture(deployFixture);

				expect(await chaos.migrator()).to.not.equal(ethers.ZeroAddress);

				const newMigrator = ethers.ZeroAddress;
				await chaos.setMigrator(newMigrator);
				expect(await chaos.migrator()).to.equal(ethers.ZeroAddress);
			});

			it("Should not migrator if migrator not set", async () => {
				const { chaos } = await loadFixture(deployFixture);

				// set migrator to non zero address

				expect(await chaos.migrator()).to.not.equal(ethers.ZeroAddress);

				// todo: test this
			});

			it("Should migrate", async () => {
				const { chaos } = await loadFixture(deployFixture);
				expect(await chaos.migrator()).to.not.equal(ethers.ZeroAddress);

				await chaos.migrate(0);
			});
		});

		it("Should get no pending rewards", async () => {
			const { chaos } = await loadFixture(deployFixture);
			const poolId = 0;
			const account = ethers.Wallet.createRandom().address;
			expect(await chaos.pendingRewards(poolId, account)).to.equal(0);
		});

		describe("Deposit and withdraw", () => {
			let _chaos: any;

			this.beforeEach(async () => {
				const { chaos } = await loadFixture(deployFixture);
				_chaos = chaos;
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
				const { chaos } = await loadFixture(deployFixture);

				const poolId = 0;
				const account = ethers.Wallet.createRandom().address;

				const tx = await chaos.withdraw(poolId, 1000000n, account);
				await tx.wait();
			});
		});

		it("Should harvest", async () => {
			const { chaos } = await loadFixture(deployFixture);

			const poolId = 0;
			const account = ethers.Wallet.createRandom().address;

			await chaos.harvest(poolId, account);
		});

		it("Should withdraw and harvest", async () => {
			const { chaos } = await loadFixture(deployFixture);

			const poolId = 0;
			const account = ethers.Wallet.createRandom().address;

			await chaos.withdrawAndHarvest(poolId, 1000000n, account);
		});

		it("Should harvest from chaos", async () => {
			const { chaos } = await loadFixture(deployFixture);
			await chaos.harvestFromChaos();
		});

		it("Should emergency withdraw", async () => {
			const { chaos } = await loadFixture(deployFixture);
			const poolId = 0;
			const account = ethers.Wallet.createRandom().address;

			await chaos.emergencyWithdraw(poolId, account);
		});
	});
});
