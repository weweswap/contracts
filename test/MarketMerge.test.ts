import { expect } from "chai";
import hre, { ethers } from "hardhat";

import { WEWE_ADDRESS, USDC_ADDRESS, WETH_ADDRESS } from "./constants";

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

		// const Mock = await ethers.getContractFactory("MockToken", ["Mock", "Mock"]);
		// const token = await Mock.deploy();

		// const test_holder = "0xEa36BDfaE0280831c1cC6Aca0E9e25C7D1ECbAf7";

		// // impersonate this guy 0xEa36BDfaE0280831c1cC6Aca0E9e25C7D1ECbAf7
		// await hre.network.provider.request({
		// 	method: "hardhat_impersonateAccount",
		// 	params: [test_holder],
		// });

		// await hre.network.provider.request({
		// 	method: "hardhat_impersonateAccount",
		// 	params: [WETH_ADDRESS],
		// });

		// const holder = await hre.ethers.getSigner(test_holder);
		// const bridge = await hre.ethers.getSigner(WETH_ADDRESS);

		// // send some eth to the holder to be able to interact with the contract
		// await bridge.sendTransaction({
		// 	to: await holder.getAddress(),
		// 	value: ethers.parseEther("10"),
		// });

		// const UniswapAdaptor = await ethers.getContractFactory(TYPE);
		// const uniswapAdaptor = await UniswapAdaptor.deploy();

		// const MergeWithMarket = await ethers.getContractFactory("MergeWithMarket");

		// // Make USDC the token for this test as we're testing uni on a fork at block 20820713
		// const mergeWithMarket = await MergeWithMarket.deploy(WEWE_ADDRESS, USDC_ADDRESS, vestingPeriod);
		// const mergeWithMarketAddress = await mergeWithMarket.getAddress();

		// // Fund the merge contract with some wewe
		// const wewe = await ethers.getContractAt("IERC20", WEWE_ADDRESS);

		// // we we whale 0x5396c2D02e28603444cD17747234285C6702Be3c
		// const wewe_whale = "0x5396c2D02e28603444cD17747234285C6702Be3c";
		// await hre.network.provider.request({
		// 	method: "hardhat_impersonateAccount",
		// 	params: [wewe_whale],
		// });

		// const whale = await hre.ethers.getSigner(wewe_whale);
		// expect(await wewe.balanceOf(whale.address)).to.be.gt(ethers.parseUnits("1000", 18));

		// // Fund the merge contract with some wewe
		// await wewe.connect(whale).transfer(mergeWithMarketAddress, ethers.parseUnits("1000", 18));

		// return { uniswapAdaptor, mergeWithMarket, holder };
	}


	describe("Merge with market", () => {
		it.only("Should merge Token mocks", async () => {
			// const { uniswapAdaptor, mergeWithMarket, holder } = await deployFixture();

			// // On fork at block 20820713, we will simulate the token to merge as USDC
			// const token = await ethers.getContractAt("IERC20", USDC_ADDRESS);
			// const wewe = await ethers.getContractAt("IERC20", WEWE_ADDRESS);

			// const token_balance = await token.balanceOf(holder.address);
			// const wewe_balance = await wewe.balanceOf(holder.address);

			// // holder account should have 5800 usdc at block 20820713
			// expect(token_balance).to.be.eq(5800000000);

			// // holder account should have 139 or so wewe at block 20820713
			// expect(wewe_balance).to.approximately(1393889258709920656678738n, 10000n);

			// // approve the merge contract to swap usdc
			// const uniswapAdaptorAddress = await uniswapAdaptor.getAddress();
			// const mergeWithMarketAddress = await mergeWithMarket.getAddress();

			// await token.connect(holder).approve(uniswapAdaptorAddress, ethers.MaxUint256);
			// await token.connect(holder).approve(mergeWithMarketAddress, ethers.MaxUint256);

			// const token_amount = ethers.parseUnits("100", 6);

			// await mergeWithMarket.connect(holder).mergeAndSell(token_amount, uniswapAdaptorAddress, "0x");

			// // Check the token balance after the swap.  Should be 0 as they were all swapped
			// const merge_balance_after = await token.balanceOf(mergeWithMarketAddress);
			// expect(merge_balance_after).to.be.eq(0);

			// // Check the wewe balance after the swap
			// const wewe_merge_balance_after = await wewe.balanceOf(mergeWithMarketAddress);
			// expect(wewe_merge_balance_after).to.be.gt(0);

			// const holder_balance = await token.balanceOf(holder.address);
			// expect(holder_balance).to.be.gt(0);
		});
	});
});
