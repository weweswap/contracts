import { expect } from "chai";
import hre, { ethers } from "hardhat";

import { WEWE_ADDRESS, USDC_ADDRESS, WETH_ADDRESS } from "./constants";
import { merge } from "../typechain-types/contracts/core";

describe("MarketMerge", () => {
	async function deployFixture() {
		// Reset the blockchain to a deterministic state
		await ethers.provider.send("hardhat_reset", [
			{
				forking: {
					jsonRpcUrl: process.env.FORKING_URL,
					blockNumber: 20820713,
				},
			},
		]);

		const [owner, otherAccount] = await ethers.getSigners();

		const Mock = await ethers.getContractFactory("MockToken");
		const token = await Mock.deploy("MockToken", "MOK");

		const WeWe = await ethers.getContractFactory("MockToken");
		const wewe = await WeWe.deploy("WeWe", "WEWE");

		const vestingPeriod = 1;
		const mockTokenAddress = await token.getAddress();
		const weweAddress = await wewe.getAddress();

		const MergeWithMarket = await ethers.getContractFactory("MergeWithMarket");
		const mergeWithMarket = await MergeWithMarket.deploy(weweAddress, mockTokenAddress, vestingPeriod);

		// Create random address for treasury
		const treasury = ethers.Wallet.createRandom().address;
		await mergeWithMarket.setTreasury(treasury);

		// Set rate
		await mergeWithMarket.setRate(5000);

		const UniswapAdaptor = await ethers.getContractFactory("MockAmm2");
		const uniswapAdaptor = await UniswapAdaptor.deploy(1, weweAddress); // 1:1 ratio

		// Add liquidity
		const uniswapAdaptorAddress = await uniswapAdaptor.getAddress();
		await wewe.approve(uniswapAdaptorAddress, ethers.parseEther("1000"));
		await token.approve(uniswapAdaptorAddress, ethers.parseEther("1000"));

		await uniswapAdaptor.addLiquidity(ethers.parseEther("1000"), mockTokenAddress);
		expect(await wewe.balanceOf(uniswapAdaptorAddress)).to.be.eq(ethers.parseEther("1000"));

		// Setup tokens
		await token.transfer(otherAccount.address, ethers.parseEther("1000"));

		const marketAddress = await mergeWithMarket.getAddress();

		// Fund with wewe
		await wewe.approve(marketAddress, ethers.parseUnits("1000", 18));
		await mergeWithMarket.deposit(ethers.parseUnits("1000", 18));

		expect(await wewe.balanceOf(marketAddress)).to.be.eq(ethers.parseUnits("1000", 18));

		await token.connect(otherAccount).approve(marketAddress, ethers.parseEther("1000"));

		return { token, uniswapAdaptor, mergeWithMarket, owner, otherAccount };
	}

	describe("Merge with market", () => {
		it.only("Should merge Token mocks", async () => {
			const { token, uniswapAdaptor, mergeWithMarket, owner, otherAccount } = await deployFixture();

			// Should have been setup with these values
			expect(await token.balanceOf(otherAccount.address)).to.be.eq(ethers.parseEther("1000"));
			expect(await mergeWithMarket.getRate()).to.be.eq(5000);

			const ammAddress = await uniswapAdaptor.getAddress();

			// arrange
			const amount = ethers.parseUnits("1", 6);
			await mergeWithMarket.connect(otherAccount).mergeAndSell(amount, ammAddress, "0x");
		});
	});
});
