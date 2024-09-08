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
import { Contract } from "ethers";

const IERC20_ABI = require("../artifacts/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json").abi;

describe.only("Farm contract", () => {
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
		const farm = await Farm.deploy(USDC_ADDRESS);

		return { farm, owner, otherAccount, accountWithFees };
	}

	describe("Farm", () => {
		let _farm: any;
		const poolId = 0;
		const allocPoint = 0;
		let _owner: any;
		let _rewarder: string;

		beforeEach(async () => {
			const { farm, owner } = await loadFixture(deployFixture);
			_farm = farm;
			_owner = owner;

			const Rewarder = await ethers.getContractFactory("MockRewarder");
			const rewarder = await Rewarder.deploy();

			_rewarder = await rewarder.getAddress();
		});

		it("Should deploy the contract with correct addresses", async () => {
			expect(await _farm.CHAOS_TOKEN()).to.equal(USDC_ADDRESS);
			expect(await _farm.poolLength()).to.equal(0);
			expect(await _farm.rewardsPerBlock()).to.equal(1);
		});

		it("Should add pool", async () => {
			expect(await _farm.add(allocPoint, USDC_ADDRESS, _rewarder)).to.emit(_farm, "LogPoolAddition");
			expect(await _farm.poolLength()).to.equal(1);
		});

		it("Should set and overwrite alloc point", async () => {
			expect(await _farm.add(allocPoint, USDC_ADDRESS, _rewarder)).to.emit(_farm, "LogPoolAddition");
			expect(await _farm.set(poolId, allocPoint, _rewarder, true)).to.emit(_farm, "LogSetPool");
		});

		describe("Migrator", () => {
			let mockMigrator: any;

			beforeEach(async () => {
				const MockMigrator = await ethers.getContractFactory("MockMigrator");
				mockMigrator = await MockMigrator.deploy();
			});

			it("Should not migrator if migrator not set", async () => {
				const { farm } = await loadFixture(deployFixture);

				// expect(await farm.migrator()).to.equal(ethers.ZeroAddress);
				// await expect(farm.migrate(0)).to.be.revertedWith("Chaos: no migrator set");
			});

			it("Should set migrator", async () => {
				expect(await _farm.migrator()).to.equal(ethers.ZeroAddress);
				await _farm.setMigrator(mockMigrator);
				expect(await _farm.migrator()).to.not.equal(ethers.ZeroAddress);
			});

			it("Should migrate", async () => {
				await _farm.setMigrator(mockMigrator);
				expect(await _farm.migrator()).to.not.equal(ethers.ZeroAddress);

				// need to add pool
				await _farm.migrate(0);
			});
		});

		describe("Rewards", () => {
			let _chaos: any;

			beforeEach(async () => {
				const { farm } = await loadFixture(deployFixture);
				_chaos = farm;
				const poolId = 0;
				const allocPoint = 0;

				const Rewarder = await ethers.getContractFactory("MockRewarder");
				const rewarder = await Rewarder.deploy();

				await _chaos.add(allocPoint, USDC_ADDRESS, rewarder.getAddress());
				await _chaos.set(poolId, allocPoint, rewarder.getAddress(), true);
			});

			it.skip("Should get no pending rewards", async () => {
				const { farm } = await loadFixture(deployFixture);
				const poolId = 0;
				const account = ethers.Wallet.createRandom().address;
				expect(await farm.pendingRewards(poolId, account)).to.equal(0);
			});
		});

		describe("Deposit and withdraw", async () => {
			let _farm: any;
			let _owner: any;
			const poolId = 0;

			beforeEach(async () => {
				const { farm, owner } = await loadFixture(deployFixture);
				_farm = farm;
				_owner = owner;

				const allocPoint = 0;

				const Rewarder = await ethers.getContractFactory("MockRewarder");
				const rewarder = await Rewarder.deploy();

				const mockLPToken = await ethers.getContractFactory("MockLPToken");
				const lpToken = await mockLPToken.deploy();

				await _farm.add(allocPoint, await lpToken.getAddress(), await rewarder.getAddress());
				await _farm.set(poolId, allocPoint, await rewarder.getAddress(), true);

				await lpToken.approve(_farm, 1000000n);
			});

			it("Should deposit lp to farm", async () => {
				const account = ethers.Wallet.createRandom().address;

				expect(await _farm.deposit(poolId, 1000000n, account))
					.to.emit(_farm, "Deposit")
					.withArgs(account, poolId, 1000000n);
			});

			it("Should withdraw", async () => {
				const account = ethers.Wallet.createRandom().address;

				expect(await _farm.withdraw(poolId, 1000000n, account))
					.to.emit(_farm, "Withdraw")
					.withArgs(account, poolId, 1000000n);
			});
		});

		describe("Harvest", async () => {
			let _farm: any;
			const poolId = 0;

			beforeEach(async () => {
				const { farm, owner } = await loadFixture(deployFixture);
				_farm = farm;

				const allocPoint = 0;
				const Rewarder = await ethers.getContractFactory("MockRewarder");
				const rewarder = await Rewarder.deploy();

				const mockLPToken = await ethers.getContractFactory("MockLPToken");
				const lpToken = await mockLPToken.deploy();

				await _farm.add(allocPoint, await lpToken.getAddress(), await rewarder.getAddress());
				await _farm.set(poolId, allocPoint, rewarder.getAddress(), true);

				const usdcContract = new ethers.Contract(USDC_ADDRESS, IERC20_ABI, owner);

				// approve and deposit usdc
				await usdcContract.approve(_farm, 1000000n);
				await lpToken.approve(_farm, 1000000n);
				await _farm.deposit(poolId, 1000000n, _owner.address);
			});

			it("Should harvest", async () => {
				const account = ethers.Wallet.createRandom().address;
				await _farm.harvest(poolId, account);
			});

			it.skip("Should withdraw and harvest", async () => {
				const account = ethers.Wallet.createRandom().address;
				await _farm.withdrawAndHarvest(poolId, 1000000n, account);
			});
		});

		it.skip("Should emergency withdraw", async () => {
			const { farm } = await loadFixture(deployFixture);
			const poolId = 0;
			const account = ethers.Wallet.createRandom().address;

			await farm.emergencyWithdraw(poolId, account);
		});
	});
});
