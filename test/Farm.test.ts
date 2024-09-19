import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import { DETERMINISTIC_MIN_HEIGHT, DETERMINISTIC_WEWE_WETH_WALLET, USDC_ADDRESS } from "./constants";

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

		const Chaos = await ethers.getContractFactory("ChaosToken");
		const chaos = await Chaos.deploy();

		const chaosAddress = await chaos.getAddress();

		const Farm = await ethers.getContractFactory("Farm");
		const farm = await Farm.deploy(chaosAddress);

		return { farm, owner, otherAccount, accountWithFees, chaos };
	}

	describe("Farm", () => {
		let _farm: any;
		let _chaos: any;
		const poolId = 0;
		const allocPoint = 0;
		let _owner: any;
		let _rewarder: string;

		beforeEach(async () => {
			const { farm, owner, chaos } = await loadFixture(deployFixture);
			_farm = farm;
			_owner = owner;
			_chaos = chaos;

			const Rewarder = await ethers.getContractFactory("MockRewarder");
			const rewarder = await Rewarder.deploy();

			_rewarder = await rewarder.getAddress();
		});

		it("Should deploy the contract with correct addresses", async () => {
			expect(await _farm.CHAOS_TOKEN()).to.equal(await _chaos.getAddress());
			expect(await _farm.poolLength()).to.equal(0);
		});

		it("Should add pool", async () => {
			await expect(await _farm.add(allocPoint, await _chaos.getAddress(), _rewarder)).to.emit(_farm, "LogPoolAddition");
			expect(await _farm.poolLength()).to.equal(1);

			const poolInfo = await _farm.poolInfo(poolId);
			const poolInfo2 = await _farm.getPoolInfo(poolId);

			expect(poolInfo).to.deep.equal(poolInfo2);
		});

		it("Should set and overwrite alloc point", async () => {
			await expect(_farm.add(0, await _chaos.getAddress(), _rewarder)).to.emit(_farm, "LogPoolAddition");
			await expect(_farm.set(0, 1, _rewarder, true)).to.emit(_farm, "LogSetPool");

			const poolInfo = await _farm.poolInfo(poolId);
			expect(poolInfo.allocPoint).to.equal(1);
		});

		it("Should update pool", async () => {
			// Arrange
			await _farm.add(0, await _chaos.getAddress(), _rewarder);
			await _farm.set(0, 1, _rewarder, true);

			expect(await _farm.poolLength()).to.equal(1);
			const blockNumber = await ethers.provider.getBlockNumber();

			// Act
			expect(await _farm.updatePool(poolId)).to.emit(_farm, "LogUpdatePool");

			// Assert
			const poolInfo = await _farm.poolInfo(poolId);
			expect(poolInfo.lastRewardBlock).to.equal(blockNumber + 1);
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
			let _rewarder: string;

			beforeEach(async () => {
				const { farm, chaos } = await loadFixture(deployFixture);
				_farm = farm;
				_chaos = chaos;

				const Rewarder = await ethers.getContractFactory("MockRewarder");
				const rewarder = await Rewarder.deploy();

				const mockLPToken = await ethers.getContractFactory("MockLPToken");
				const lpToken = await mockLPToken.deploy();

				_rewarder = await rewarder.getAddress();
				await _farm.add(allocPoint, await lpToken.getAddress(), _rewarder);
				await _farm.set(poolId, allocPoint, _rewarder, true);

				await chaos.setFarm(await _farm.getAddress());
				await chaos.approve(await _farm.getAddress(), 1000000n);
			});

			it("Should allocate CHAOS tokens", async () => {
				const farmAddress = await _farm.getAddress();
				expect(await _chaos.balanceOf(farmAddress)).to.equal(1000000n);

				expect(await _farm.poolLength()).to.equal(1);
				await expect(_farm.allocateTokens(poolId, 1000000n)).to.emit(_farm, "LogPoolAllocation").withArgs(poolId, 1000000n);

				const poolInfo = await _farm.poolInfo(poolId);
				expect(poolInfo.totalSupply).to.equal(1000000n);
			});

			it("Should set vault weight", async () => {
				await _farm.set(poolId, 1, _rewarder, true);
				let poolInfo = await _farm.poolInfo(poolId);
				expect(poolInfo.allocPoint).to.equal(1);

				expect(await _farm.setVaultWeight(poolId, 100)).to.emit(_farm, "LogSetVaultWeight");
				poolInfo = await _farm.poolInfo(poolId);

				expect(poolInfo.allocPoint).to.equal(1);
				expect(poolInfo.weight).to.equal(100);
			});
		});

		describe("Rewards", async () => {
			let _farm: any;
			let _lpToken: any;
			let _chaos: any;
			let ownerAddress: any;
			const poolId = 0;
			const allocPoint = 1;

			beforeEach(async () => {
				const { farm, chaos, owner } = await loadFixture(deployFixture);
				_farm = farm;
				_chaos = chaos;

				await chaos.setFarm(await _farm.getAddress());

				ownerAddress = await owner.getAddress();

				const Rewarder = await ethers.getContractFactory("MockRewarder");
				const rewarder = await Rewarder.deploy();

				const mockLPToken = await ethers.getContractFactory("MockLPToken");
				_lpToken = await mockLPToken.deploy();

				await _lpToken.approve(_farm, 1000000n);
				await _farm.add(allocPoint, await _lpToken.getAddress(), await rewarder.getAddress());

				// set the reward per block
				await _farm.setEmisionsPerBlock(1);

				// allocate tokens
				await _chaos.mint(1000000n);
				await _farm.allocateTokens(poolId, 1000000n);
			});

			it("Should set emissions per block", async () => {
				await expect(_farm.setEmisionsPerBlock(2)).to.emit(_farm, "LogSetEmisionsPerBlock");
			});

			it("Should get no pending rewards", async () => {
				expect(await _farm.poolLength()).to.equal(1);

				const account = ethers.Wallet.createRandom().address;
				expect(await _farm.pendingRewards(poolId, account)).to.equal(0);
			});

			it("Should get rewards per block", async () => {
				const blockNumber = await ethers.provider.getBlockNumber();

				const rewardsPerBlock = await _farm.rewardsPerBlock.staticCall(poolId);
				expect(rewardsPerBlock).to.equal(1);

				let pendingRewards = await _farm.pendingRewards.staticCall(poolId, ownerAddress);
				expect(pendingRewards).to.equal(0);

				await _farm.deposit(poolId, 1000000n, ownerAddress);
				await time.increase(1000);

				const blockNumber2 = await ethers.provider.getBlockNumber();
				expect(blockNumber2).to.be.greaterThan(blockNumber);

				// call the update pool to change the state variables
				expect(await _farm.updatePool(poolId))
					.to.emit(_farm, "LogUpdatePool")
					.withArgs(poolId, blockNumber2, 1000000n, 1);

				const poolInfo = await _farm.poolInfo(poolId);
				expect(poolInfo.accChaosPerShare).to.equal(2000000);
				expect(poolInfo.lastRewardBlock).to.equal(blockNumber2 + 1);
				expect(poolInfo.allocPoint).to.equal(1);
				expect(poolInfo.totalSupply).to.equal(1000000n);

				pendingRewards = await _farm.pendingRewards.staticCall(poolId, ownerAddress);
				expect(pendingRewards).to.equal((BigInt(poolInfo.accChaosPerShare) * 1000000n) / 1000000000000n);
			});
		});

		describe("Deposit and withdraw", async () => {
			let _farm: any;
			let _lpToken: any;
			let _owner: any;
			const poolId = 0;

			const approveAndCall = false;
			const account = ethers.Wallet.createRandom().address;

			beforeEach(async () => {
				const { farm, owner } = await loadFixture(deployFixture);
				_farm = farm;
				_owner = owner.address;

				const allocPoint = 0;

				const Rewarder = await ethers.getContractFactory("MockRewarder");
				const rewarder = await Rewarder.deploy();

				const mockLPToken = await ethers.getContractFactory("MockLPToken");
				_lpToken = await mockLPToken.deploy();

				await _farm.add(allocPoint, await _lpToken.getAddress(), await rewarder.getAddress());
				await _farm.set(poolId, allocPoint, await rewarder.getAddress(), true);

				if (!approveAndCall) {
					await _lpToken.approve(_farm, 2000000n);
				}

				await _farm.deposit(poolId, 1000000n, account);
			});

			it("Should deposit", async () => {
				await expect(_farm.deposit(poolId, 1000000n, account))
					.to.emit(_farm, "Deposit")
					.withArgs(_owner, poolId, 1000000n, account);

				// Get user info
				const userInfo = await _farm.userInfo(poolId, account);
				expect(userInfo[0]).to.equal(2000000n);
			});

			it("Should withdraw", async () => {
				await _farm.deposit(poolId, 1000000n, _owner);

				let userInfo = await _farm.userInfo(poolId, _owner);
				expect(userInfo[0]).to.equal(1000000n);

				await expect(_farm.withdraw(poolId, 1000000n, _owner))
					.to.emit(_farm, "Withdraw")
					.withArgs(_owner, poolId, 1000000n, _owner);

				userInfo = await _farm.userInfo(poolId, _owner);
				expect(userInfo[0]).to.equal(0);
			});

			it("Should perform an emergency withdraw", async () => {
				await _farm.deposit(poolId, 1000000n, _owner);
				const balance = await _lpToken.balanceOf(_owner);
				expect(balance).to.not.eq(0);

				const userInfo = await _farm.userInfo(poolId, _owner);
				expect(userInfo[0]).to.equal(1000000n);

				await expect(_farm.emergencyWithdraw(poolId)).to.emit(_farm, "EmergencyWithdraw").withArgs(_owner, poolId, 1000000n, _owner);

				const exitbalance = await _lpToken.balanceOf(_owner);
				expect(exitbalance).to.be.eq(999999999999999999000000n);
			});

			// it("Should allow owner to refund", async () => {
			// 	await expect(_farm.refund()).to.emit(_farm, "Refund");

			// 	const farmAddress = await _farm.getAddress();
			// 	expect(await _lpToken.balanceOf(farmAddress)).to.equal(0);
			// });
		});

		describe("Harvest", async () => {
			let _farm: any;
			const poolId = 0;
			let _owner: any;

			beforeEach(async () => {
				const { farm, owner, chaos } = await loadFixture(deployFixture);
				_farm = farm;
				_owner = owner.address;

				await chaos.setFarm(await _farm.getAddress());

				const allocPoint = 1;
				const Rewarder = await ethers.getContractFactory("MockRewarder");
				const rewarder = await Rewarder.deploy();

				const mockLPToken = await ethers.getContractFactory("MockLPToken");
				const lpToken = await mockLPToken.deploy();

				// set the reward per block
				await _farm.setEmisionsPerBlock(1);

				await _farm.add(allocPoint, await lpToken.getAddress(), await rewarder.getAddress());
				await _farm.set(poolId, allocPoint, await rewarder.getAddress(), true);
				await chaos.mint(1000000n);
				await _farm.allocateTokens(poolId, 1000000n);

				const usdcContract = new ethers.Contract(USDC_ADDRESS, IERC20_ABI, owner);

				// approve and deposit usdc share
				await usdcContract.approve(_farm, 1000000n);
				await lpToken.approve(_farm, 1000000n);
				await _farm.deposit(poolId, 1000000n, _owner);
			});

			it.only("Should harvest", async () => {
				let poolInfo = await _farm.poolInfo(poolId);
				const lastRewardBlock = poolInfo.lastRewardBlock;
				expect(lastRewardBlock).to.greaterThanOrEqual(19197428);

				await time.increase(1000);
				await _farm.updatePool(poolId);

				poolInfo = await _farm.poolInfo(poolId);
				expect(poolInfo.lastRewardBlock).to.greaterThanOrEqual(lastRewardBlock);

				const pending = await _farm.pendingRewards.staticCall(poolId, _owner);
				expect(pending).to.equal(2);

				await expect(_farm.harvest(poolId, _owner)).to.emit(_farm, "Harvest");
			});

			it("Should withdraw and harvest", async () => {
				const account = ethers.Wallet.createRandom().address;
				await expect(_farm.withdrawAndHarvest(poolId, 1000000n, account)).to.emit(_farm, "WithdrawAndHarvest");
			});
		});
	});
});
