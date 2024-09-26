import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

import { DETERMINISTIC_MIN_HEIGHT } from "./constants";

describe("Generic Eater contract", () => {
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
		await wewe.transfer(eaterAddress, 1000);

		// Arrange for the otherAccount to have some tokens
		await token.transfer(otherAccount.address, 1000);

		// Approve the eater to spend the tokens
		await token.connect(otherAccount).approve(eaterAddress, 1000);

		return { wewe, token, eater, owner, otherAccount };
	}

	describe.only("Eater", () => {
		it("Should deploy the contracts and eat some tokens, nom nom nom", async () => {
			const { wewe, eater, token, otherAccount } = await deployFixture();

			// const [weweAddress, tokenAddress] = await Promise.all([wewe.getAddress(), token.getAddress()]);

			// do in parallel
			const [weweBalanceBefore, tokenBalanceBefore] = await Promise.all([wewe.balanceOf(otherAccount.address), token.balanceOf(otherAccount.address)]);

			expect(weweBalanceBefore).to.equal(0);
			expect(tokenBalanceBefore).to.equal(1000);

			console.log("Eating all the tokens from the other account");
			console.log(otherAccount.address);

			const eaterAddress = await eater.getAddress();
			await wewe.connect(otherAccount).approveAndCall(eaterAddress, 1000, "0x00");

			const [weweBalanceAfter, tokenBalanceAfter] = await Promise.all([wewe.balanceOf(otherAccount.address), token.balanceOf(otherAccount.address)]);

			// Should be inverted
			expect(weweBalanceAfter).to.equal(1000);
			expect(tokenBalanceAfter).to.equal(0);
		});
	});
});
