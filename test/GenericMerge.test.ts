import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import { DETERMINISTIC_MIN_HEIGHT } from "./constants";

describe("Generic merge contract", () => {
	async function deployFixture(weweAmount: number = 1000, tokenAmount: number = 1000) {
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

		const WeWe = await ethers.getContractFactory("Wewe");
		const wewe = await WeWe.deploy();

		const Token = await ethers.getContractFactory("MockToken");
		const token = await Token.deploy("Token", "TKN");

		const weweAddress = await wewe.getAddress();
		const tokenAddress = await token.getAddress();

		const Eater = await ethers.getContractFactory("GenericEater");
		const eater = await Eater.deploy(weweAddress, tokenAddress);

		const eaterAddress = await eater.getAddress();

		// Fund the eater with some wewe tokens
		await wewe.transfer(eaterAddress, weweAmount);

		// Arrange for the otherAccount to have some tokens
		await token.transfer(otherAccount.address, tokenAmount);

		// Approve the eater to spend the tokens
		await token.connect(otherAccount).approve(eaterAddress, tokenAmount);

		return { wewe, token, eater, owner, otherAccount };
	}

	describe("Merge", () => {
		it("Should eat some tokens, nom nom nom", async () => {
			const { wewe, eater, token, otherAccount } = await deployFixture();

			const [weweBalanceBefore, tokenBalanceBefore] = await Promise.all([wewe.balanceOf(otherAccount.address), token.balanceOf(otherAccount.address)]);

			expect(weweBalanceBefore).to.equal(0);
			expect(tokenBalanceBefore).to.equal(1000);

			const eaterAddress = await eater.getAddress();
			await wewe.connect(otherAccount).approveAndCall(eaterAddress, 1000, "0x00");

			const [weweBalanceAfter, tokenBalanceAfter] = await Promise.all([wewe.balanceOf(otherAccount.address), token.balanceOf(otherAccount.address)]);

			expect(weweBalanceAfter).to.equal(1000);
			expect(tokenBalanceAfter).to.equal(0);
		});

		it("Should eat some tokens at 2:1", async () => {
			const { wewe, eater, token, otherAccount } = await deployFixture(2000, 1000);

			await eater.setRate(200);

			const [weweBalanceBefore, tokenBalanceBefore] = await Promise.all([wewe.balanceOf(otherAccount.address), token.balanceOf(otherAccount.address)]);

			expect(weweBalanceBefore).to.equal(0);
			expect(tokenBalanceBefore).to.equal(1000);

			const eaterAddress = await eater.getAddress();
			await wewe.connect(otherAccount).approveAndCall(eaterAddress, 1000, "0x00");

			const [weweBalanceAfter, tokenBalanceAfter] = await Promise.all([wewe.balanceOf(otherAccount.address), token.balanceOf(otherAccount.address)]);

			expect(weweBalanceAfter).to.equal(2000);
			expect(tokenBalanceAfter).to.equal(0);
		});
	});
});
