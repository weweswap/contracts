import { expect } from "chai";
import { ethers } from "hardhat";

import { DETERMINISTIC_MIN_HEIGHT } from "./constants";

describe("Generic merge contract", () => {
	async function deployFixture(weweAmount: number = 1000, tokenAmount: number = 1000, vestingPeriod: number = 0) {
		const [owner, otherAccount, otherAccount2] = await ethers.getSigners();
		// Reset the blockchain to a deterministic state
		await ethers.provider.send("hardhat_reset", [
			{
				forking: {
					jsonRpcUrl: process.env.FORKING_URL,
					blockNumber: DETERMINISTIC_MIN_HEIGHT,
				},
			},
		]);

		const WeWe = await ethers.getContractFactory("Wewe");
		const wewe = await WeWe.deploy();

		const Token = await ethers.getContractFactory("MockToken");
		const token = await Token.deploy("Token", "TKN");

		const weweAddress = await wewe.getAddress();
		const tokenAddress = await token.getAddress();

		const Merge = await ethers.getContractFactory("GenericMerge");
		const merge = await Merge.deploy(weweAddress, tokenAddress, vestingPeriod);

		const mergeAddress = await merge.getAddress();

		// Fund the merge with some wewe tokens
		await wewe.transfer(mergeAddress, weweAmount);

		// Arrange for the otherAccount to have some tokens
		await token.transfer(otherAccount.address, tokenAmount);

		// Arrange for the otherAccount to have some tokens
		await token.transfer(otherAccount2.address, tokenAmount);

		// Approve the merge to spend the tokens
		await token.connect(otherAccount).approve(mergeAddress, tokenAmount);

		return { wewe, token, merge, owner, otherAccount, otherAccount2 };
	}

	describe("Merge", () => {
		it("Should set vesting duration", async () => {
			const { merge, owner } = await deployFixture();

			expect(await merge.vestingDuration()).to.equal(0);

			await merge.connect(owner).setVestingDuration(1440);

			expect(await merge.vestingDuration()).to.equal(1440);
		});

		it("Should eat some tokens, nom nom nom", async () => {
			const { wewe, merge, token, otherAccount } = await deployFixture();

			const [weweBalanceBefore, tokenBalanceBefore] = await Promise.all([wewe.balanceOf(otherAccount.address), token.balanceOf(otherAccount.address)]);

			expect(weweBalanceBefore).to.equal(0);
			expect(tokenBalanceBefore).to.equal(1000);
			const mergeAddress = await merge.getAddress();
			await token.connect(otherAccount).approveAndCall(mergeAddress, 1000, "0x00");

			const [weweBalanceAfter, tokenBalanceAfter] = await Promise.all([wewe.balanceOf(otherAccount.address), token.balanceOf(otherAccount.address)]);

			expect(weweBalanceAfter).to.equal(1000);
			expect(tokenBalanceAfter).to.equal(0);
		});

		it("Should eat some tokens at 2:1", async () => {
			const { wewe, merge, token, otherAccount } = await deployFixture(2000, 1000);

			await merge.setRate(200);

			const [weweBalanceBefore, tokenBalanceBefore] = await Promise.all([wewe.balanceOf(otherAccount.address), token.balanceOf(otherAccount.address)]);

			expect(weweBalanceBefore).to.equal(0);
			expect(tokenBalanceBefore).to.equal(1000);

			const mergeAddress = await merge.getAddress();
			await token.connect(otherAccount).approveAndCall(mergeAddress, 1000, "0x00");

			const [weweBalanceAfter, tokenBalanceAfter] = await Promise.all([wewe.balanceOf(otherAccount.address), token.balanceOf(otherAccount.address)]);

			expect(weweBalanceAfter).to.equal(2);
			expect(tokenBalanceAfter).to.equal(0);
		});

		it("Should eat some tokens at 0.5:1", async () => {
			const { wewe, merge, token, otherAccount } = await deployFixture(2000, 1000);

			await merge.setRate(50);

			const [weweBalanceBefore, tokenBalanceBefore] = await Promise.all([wewe.balanceOf(otherAccount.address), token.balanceOf(otherAccount.address)]);

			expect(weweBalanceBefore).to.equal(0);
			expect(tokenBalanceBefore).to.equal(1000);

			const mergeAddress = await merge.getAddress();
			await token.connect(otherAccount).approveAndCall(mergeAddress, 1000, "0x00");

			const [weweBalanceAfter, tokenBalanceAfter] = await Promise.all([wewe.balanceOf(otherAccount.address), token.balanceOf(otherAccount.address)]);

			// half of 1000 is 500
			expect(weweBalanceAfter).to.equal(0);
			expect(tokenBalanceAfter).to.equal(0);
		});

		it("should allow only the owner to toggle pause", async () => {
			const { merge, owner, otherAccount } = await deployFixture(2000, 1000);

			// Owner can toggle pause
			await expect(merge.connect(owner).togglePause()).to.not.be.reverted;

			// Contract should be paused
			expect(await merge.paused()).to.equal(true);

			// Non-owner cannot toggle pause
			await expect(merge.connect(otherAccount).togglePause()).to.be.revertedWith("Ownable: caller is not the owner");
		});

		// Verify these requirements:
		it.skip("should not sweep when unpaused", async () => {
			const { wewe, merge, owner, otherAccount } = await deployFixture(1000, 1000);

			// Owner can toggle pause to On
			await merge.connect(owner).togglePause();

			// Non-owner attempts to call sweep
			await expect(merge.connect(owner).sweep()).to.be.revertedWith("Pausable: not paused");
		});

		it("should allow only the owner to call sweep", async () => {
			const { wewe, merge, owner, otherAccount } = await deployFixture(1000, 1000);

			// Non-owner attempts to call sweep
			await expect(merge.connect(otherAccount).sweep()).to.be.revertedWith("Ownable: caller is not the owner");

			const ownerWeweBalanceBefore = await wewe.balanceOf(owner.address);

			await merge.connect(owner).sweep();
			const ownerWeweBalanceAfter = await wewe.balanceOf(owner.address);

			expect(ownerWeweBalanceBefore).to.be.lessThan(ownerWeweBalanceAfter);
			expect(ownerWeweBalanceAfter).to.equal(100000000000000000000000000000n);

			await expect(merge.connect(owner).sweep()).to.be.revertedWith("Eater: No balance to sweep");
		});

		it("should not claim until vesting period is over", async () => {
			const vestingPeriod = 1440;
			const { wewe, merge, token, owner, otherAccount } = await deployFixture(1000, 1000, vestingPeriod);

			await merge.setRate(100);

			const [weweBalanceBefore, tokenBalanceBefore] = await Promise.all([wewe.balanceOf(otherAccount.address), token.balanceOf(otherAccount.address)]);

			expect(weweBalanceBefore).to.equal(0);
			expect(tokenBalanceBefore).to.equal(1000);

			const mergeAddress = await merge.getAddress();
			await token.connect(otherAccount).approve(mergeAddress, 1000);
			await merge.connect(otherAccount).merge(10);

			await expect(merge.connect(otherAccount).claim()).to.be.revertedWith("Eater: Vesting not ended");

			// Fast forward time
			await ethers.provider.send("evm_increaseTime", [86400]);

			await merge.connect(otherAccount).claim();
		});

		it("should not merge if exceed wewe balance", async () => {
			const vestingPeriod = 1440;
			const { wewe, merge, token, otherAccount } = await deployFixture(10, 1000, vestingPeriod);

			await merge.setRate(100000);

			const [weweBalanceBefore, tokenBalanceBefore] = await Promise.all([wewe.balanceOf(otherAccount.address), token.balanceOf(otherAccount.address)]);

			expect(weweBalanceBefore).to.equal(0);
			expect(tokenBalanceBefore).to.equal(1000);

			const mergeAddress = await merge.getAddress();
			await token.connect(otherAccount).approve(mergeAddress, 1000);
			await expect(merge.connect(otherAccount).merge(11)).to.be.revertedWith("Eater: Insufficient Wewe balance");
		});

		it("should not merge if exceed wewe balance two users", async () => {
			const vestingPeriod = 1440;
			const { wewe, merge, token, otherAccount, otherAccount2 } = await deployFixture(10, 1000, vestingPeriod);

			await merge.setRate(100000);

			const [weweBalanceBefore, tokenBalanceBefore, tokenBalance2Before] = await Promise.all([
				wewe.balanceOf(otherAccount.address),
				token.balanceOf(otherAccount.address),
				token.balanceOf(otherAccount2.address),
			]);

			expect(weweBalanceBefore).to.equal(0);
			expect(tokenBalanceBefore).to.equal(1000);
			expect(tokenBalance2Before).to.equal(1000);

			const mergeAddress = await merge.getAddress();
			await token.connect(otherAccount).approve(mergeAddress, 1000);
			await token.connect(otherAccount2).approve(mergeAddress, 1000);
			await merge.connect(otherAccount).merge(5);
			await merge.connect(otherAccount2).merge(5);

			const sumOfVested = await merge.sumOfVested();
			expect(sumOfVested).to.equal(10);

			await expect(merge.connect(otherAccount).merge(1)).to.be.revertedWith("Eater: Insufficient Wewe balance");
		});

		it("should reduce vesting amount once claim happens", async () => {
			const vestingPeriod = 1440;
			const { wewe, merge, token, otherAccount, otherAccount2 } = await deployFixture(10, 1000, vestingPeriod);

			await merge.setRate(100000);

			const [weweBalanceBefore, tokenBalanceBefore, tokenBalance2Before] = await Promise.all([
				wewe.balanceOf(otherAccount.address),
				token.balanceOf(otherAccount.address),
				token.balanceOf(otherAccount2.address),
			]);

			expect(weweBalanceBefore).to.equal(0);
			expect(tokenBalanceBefore).to.equal(1000);
			expect(tokenBalance2Before).to.equal(1000);

			const mergeAddress = await merge.getAddress();
			await token.connect(otherAccount).approve(mergeAddress, 1000);
			await token.connect(otherAccount2).approve(mergeAddress, 1000);
			await merge.connect(otherAccount).merge(5);
			await merge.connect(otherAccount2).merge(5);

			let sumOfVested = await merge.sumOfVested();
			expect(sumOfVested).to.equal(10);

			await ethers.provider.send("evm_increaseTime", [86400]);

			await merge.connect(otherAccount).claim();
			sumOfVested = await merge.sumOfVested();
			expect(sumOfVested).to.equal(5);
			await expect(merge.connect(otherAccount).merge(1)).to.be.revertedWith("Eater: Insufficient Wewe balance");

			await merge.connect(otherAccount2).claim();
			sumOfVested = await merge.sumOfVested();
			expect(sumOfVested).to.equal(0);
			await expect(merge.connect(otherAccount).merge(1)).to.be.revertedWith("Eater: Insufficient Wewe balance");
		});
	});
});
