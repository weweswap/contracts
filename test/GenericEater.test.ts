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

		// Arrange for the otherAccount to have some tokens
		await token.transfer(otherAccount.address, 1000);

		return { wewe, token, eater, owner, otherAccount };
	}

	describe.only("Eater", () => {
		it("Should deploy the contracts and eat some tokens, nom nom nom", async () => {
			const { wewe } = await deployFixture();
		});
	});
});
