import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
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

const IERC20_ABI = require("../artifacts/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json").abi;

describe("Farm contract", () => {
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

		const Chaos = await ethers.getContractFactory("ChaosToken");
		const chaos = await Chaos.deploy([]);

		const chaosAddress = await chaos.getAddress();

		const Farm = await ethers.getContractFactory("Farm");
		const farm = await Farm.deploy(chaosAddress);

		return { farm, owner, otherAccount, accountWithFees, chaos };
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
		});

		it("Should add pool", async () => {
			expect(await _farm.add(allocPoint, USDC_ADDRESS, _rewarder)).to.emit(_farm, "LogPoolAddition");
			expect(await _farm.poolLength()).to.equal(1);

			const poolInfo = await _farm.poolInfo(poolId);
			const poolInfo2 = await _farm.getPoolInfo(poolId);

			expect(poolInfo).to.deep.equal(poolInfo2);
		});

		it("Should set and overwrite alloc point", async () => {
			expect(await _farm.add(0, USDC_ADDRESS, _rewarder)).to.emit(_farm, "LogPoolAddition");
			expect(await _farm.set(0, 1, _rewarder, true)).to.emit(_farm, "LogSetPool");

			const poolInfo = await _farm.poolInfo(poolId);
			expect(poolInfo.allocPoint).to.equal(1);
		});

		it("Should update pool", async () => {
			const blockNumber = await ethers.provider.getBlockNumber();
			expect(await _farm.poolLength()).to.equal(1);
			expect(await _farm.updatePool(poolId)).to.emit(_farm, "LogUpdatePool");

			const poolInfo = await _farm.poolInfo(poolId);
			expect(poolInfo.lastRewardBlock).to.equal(blockNumber);
		});

		describe("Migrator", () => {
			let mockMigrator: any;

			beforeEach(async () => {
				const MockMigrator = await ethers.getContractFactory("MockMigrator");
				mockMigrator = await MockMigrator.deploy();
			});

			it("Should not migrator if migrator not set", async () => {
				const { farm } = await loadFixture(deployFixture);

				expect(await farm.migrator()).to.equal(ethers.ZeroAddress);
				await expect(farm.migrate(0)).to.be.revertedWith("Chaos: no migrator set");
			});

			it("Should set migrator", async () => {
				expect(await _farm.migrator()).to.equal(ethers.ZeroAddress);
				await _farm.setMigrator(mockMigrator);
				expect(await _farm.migrator()).to.not.equal(ethers.ZeroAddress);
			});

			// will need to implement the mockMigrator
			it.skip("Should migrate", async () => {
				await _farm.setMigrator(mockMigrator);
				expect(await _farm.migrator()).to.not.equal(ethers.ZeroAddress);

				// set the pool
				await _farm.add(allocPoint, USDC_ADDRESS, _rewarder);
				await _farm.migrate(0);
			});
		});

		describe("Allocate", () => {
			let _farm: any;
			let _chaos: any;
			const poolId = 0;
			const allocPoint = 0;

			beforeEach(async () => {
				const { farm, chaos } = await loadFixture(deployFixture);
				_farm = farm;
				_chaos = chaos;

				const Rewarder = await ethers.getContractFactory("MockRewarder");
				const rewarder = await Rewarder.deploy();

				const mockLPToken = await ethers.getContractFactory("MockLPToken");
				const lpToken = await mockLPToken.deploy();

				await _farm.add(allocPoint, await lpToken.getAddress(), rewarder.getAddress());
				await _farm.set(poolId, allocPoint, rewarder.getAddress(), true);
			});

			it.only("Should allocate $CHAOS tokens", async () => {
				const farmAddress = await _farm.getAddress();
				await _chaos.transfer(farmAddress, 1000000n);
				expect(await _chaos.balanceOf(farmAddress)).to.equal(1000000n);

				expect(await _farm.poolLength()).to.equal(1);
				expect(await _farm.allocateTokens(poolId, 1000000n))
					.to.emit(_farm, "LogPoolAllocation")
					.withArgs(poolId, 1000000n);

				const poolInfo = await _farm.poolInfo(poolId);
				expect(poolInfo.totalSupply).to.equal(1000000n);
			});
		});

		describe.only("Rewards", async () => {
			let _farm: any;
			let _lpToken: any;
			const poolId = 0;
			const allocPoint = 1;

			beforeEach(async () => {
				const { farm } = await loadFixture(deployFixture);
				_farm = farm;

				const Rewarder = await ethers.getContractFactory("MockRewarder");
				const rewarder = await Rewarder.deploy();

				const mockLPToken = await ethers.getContractFactory("MockLPToken");
				_lpToken = await mockLPToken.deploy();

				await _farm.add(allocPoint, await _lpToken.getAddress(), await rewarder.getAddress());
				await _farm.set(poolId, allocPoint, await rewarder.getAddress(), true);

				await _lpToken.approve(_farm, 1000000n);
			});

			it("Should get no pending rewards", async () => {
				expect(await _farm.poolLength()).to.equal(1);

				const account = ethers.Wallet.createRandom().address;
				expect(await _farm.pendingRewards(poolId, account)).to.equal(0);
			});

			it.only("Should get rewards per block", async () => {
				const blockNumber = await ethers.provider.getBlockNumber();
				console.log("blockNumber", blockNumber);

				const rewardsPerBlock = await _farm.rewardsPerBlock.staticCall(poolId);
				expect(rewardsPerBlock).to.equal(0);

				await _farm.deposit(poolId, 1000000n, _owner.address);

				await time.increase(1000);
				const blockNumber2 = await ethers.provider.getBlockNumber();
				console.log("blockNumber2", blockNumber2);

				expect(blockNumber2).to.be.greaterThan(blockNumber);

				const rewardsPerBlock2 = await _farm.rewardsPerBlock.staticCall(poolId);

				expect(rewardsPerBlock2).to.equal(0);
			});
		});

		describe("Deposit and withdraw", async () => {
			let _farm: any;
			let _owner: any;
			const poolId = 0;

			const account = ethers.Wallet.createRandom().address;

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

			it("Should deposit shares to farm", async () => {
				expect(await _farm.deposit(poolId, 1000000n, account))
					.to.emit(_farm, "Deposit")
					.withArgs(account, poolId, 1000000n);
			});

			// Todo: need to do setup and block mining
			it("Should withdraw", async () => {
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
				await _farm.set(poolId, allocPoint, await rewarder.getAddress(), true);

				const usdcContract = new ethers.Contract(USDC_ADDRESS, IERC20_ABI, owner);

				// approve and deposit usdc share
				await usdcContract.approve(_farm, 1000000n);
				await lpToken.approve(_farm, 1000000n);
				await _farm.deposit(poolId, 1000000n, _owner.address);
			});

			it("Should harvest", async () => {
				const account = ethers.Wallet.createRandom().address;
				expect(await _farm.harvest(poolId, account)).to.emit(_farm, "Harvest");
			});

			it("Should withdraw and harvest", async () => {
				const account = ethers.Wallet.createRandom().address;
				await _farm.withdrawAndHarvest(poolId, 1000000n, account);
			});
		});

		it("Should emergency withdraw", async () => {
			const { farm } = await loadFixture(deployFixture);
			const poolId = 0;
			const account = ethers.Wallet.createRandom().address;

			await farm.emergencyWithdraw(poolId, account);
		});
	});
});
