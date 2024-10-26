import { expect } from "chai";
import hre, { ethers } from "hardhat";

import { WEWE_ADDRESS, USDC_ADDRESS, WETH_ADDRESS } from "./constants";

describe("Fomo Adaptor", () => {
	async function deployFixture(TYPE: string = "Fomo", vestingPeriod: number = 0) {
		// Reset the blockchain to a deterministic state
		await ethers.provider.send("hardhat_reset", [
			{
				forking: {
					jsonRpcUrl: process.env.FORKING_URL,
					blockNumber: 21568138,
				},
			},
		]);

		const test_holder = "0x0625Db97368dF1805314E68D0E63e5eB154B9AE6";
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [test_holder],
		});

		// await hre.network.provider.request({
		// 	method: "hardhat_impersonateAccount",
		// 	params: [WETH_ADDRESS],
		// });

		const Adaptor = await ethers.getContractFactory("Fomo");
		const adaptor = await Adaptor.deploy();

		const fomo = await ethers.getContractAt("IERC20", "0xd327d36EB6E1f250D191cD62497d08b4aaa843Ce");
		const holder = await ethers.getSigner(test_holder);

		return { adaptor, holder, fomo };

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

	describe.only("FOMO", () => {
		it("Should test route", async () => {
			const { adaptor, holder, fomo } = await deployFixture();
			const balance = await fomo.balanceOf(holder.address);
			expect(balance).to.be.gt(ethers.parseUnits("1", 9));

			const adaptor_address = await adaptor.getAddress();
			console.log(adaptor_address);
			const fomo_address = await fomo.getAddress();

			// await fomo.connect(holder).transfer(adaptor_address, ethers.parseUnits("1", 9));

			await fomo.connect(holder).approve(adaptor_address, ethers.parseUnits("100", 9));

			const allowance = await fomo.allowance(holder.address, "0x7bCD8185B7f4171017397993345726E15457B1eE");
			console.log(allowance.toString());
			// expect(allowance).to.be.eq(ethers.MaxUint256);

			// await adaptor.connect(holder).sell(ethers.parseUnits("1", 9), fomo_address, holder.address, "0x");
		});

		// it("Should deploy the contract with correct params", async () => {
		// 	const { uniswapAdaptor, mergeWithMarket } = await deployFixture();

		// 	expect(await uniswapAdaptor.fee()).to.equal(10000);
		// 	expect(await mergeWithMarket.getToken()).to.be.eq(USDC_ADDRESS);
		// });

		// Not working but is replaced by new contract
		// Also, .skip is not working...
		// @todo: Fix this test
		// it.skip("Should call uniswap router via the adaptor", async () => {
		// 	const { uniswapAdaptor, holder } = await deployFixture("UniswapV3ViaRouter");

		// 	// On fork at block 20820713, we will simulate the token to merge as USDC
		// 	const token = await ethers.getContractAt("IERC20", USDC_ADDRESS);
		// 	const wewe = await ethers.getContractAt("IERC20", WEWE_ADDRESS);
		// 	const uniswapAdaptorAddress = await uniswapAdaptor.getAddress();

		// 	// Should have 0 tokens in the contract, and holder have 139 wewe at block 20820713
		// 	const token_balance = await token.balanceOf(uniswapAdaptorAddress);
		// 	expect(token_balance).to.be.eq(0);

		// 	const wewe_holder_balance_before = await wewe.balanceOf(holder.address);
		// 	expect(wewe_holder_balance_before).to.approximately(1393889258709920656678738n, 10000n);

		// 	// Approve the uniswap adaptor to spend the holder's tokens
		// 	await token.connect(holder).approve(uniswapAdaptorAddress, ethers.MaxUint256);
		// 	expect(await token.allowance(holder.address, uniswapAdaptorAddress)).to.be.eq(ethers.MaxUint256);

		// 	// Swap 100 of the 5800 usdc for wewe via uniswap on fork at block 20820713
		// 	await uniswapAdaptor.connect(holder).sell(ethers.parseUnits("100", 6), USDC_ADDRESS, holder.address, "0x");

		// 	// Check the wewe balance after the swap
		// 	const wewe_holder_balance_after = await wewe.balanceOf(holder.address);
		// 	expect(wewe_holder_balance_after).to.be.gt(wewe_holder_balance_before);
		// });

		// it.only("Should call uniswap router via intermediate token", async () => {
		// 	const { uniswapAdaptor, holder } = await deployFixture("UniswapV3ViaRouterIM");

		// 	// On fork at block 20820713, we will simulate the token to merge as USDC
		// 	const token = await ethers.getContractAt("IERC20", USDC_ADDRESS);
		// 	const weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);
		// 	const uniswapAdaptorAddress = await uniswapAdaptor.getAddress();

		// 	// Should have 0 tokens in the contract, and holder have 139 wewe at block 20820713
		// 	const token_balance = await token.balanceOf(uniswapAdaptorAddress);
		// 	expect(token_balance).to.be.eq(0);

		// 	const weth_holder_balance_before = await weth.balanceOf(holder.address);
		// 	expect(weth_holder_balance_before).to.be.eq(0);

		// 	// Approve the uniswap adaptor to spend the holder's tokens
		// 	await token.connect(holder).approve(uniswapAdaptorAddress, ethers.MaxUint256);
		// 	expect(await token.allowance(holder.address, uniswapAdaptorAddress)).to.be.eq(ethers.MaxUint256);

		// 	// Swap 100 of the 5800 usdc for wewe via uniswap on fork at block 20820713
		// 	await uniswapAdaptor.connect(holder).sell(ethers.parseUnits("100", 6), USDC_ADDRESS, holder.address, "0x");

		// 	// Check the wewe balance after the swap
		// 	const weth_holder_balance_after = await weth.balanceOf(holder.address);
		// 	expect(weth_holder_balance_after).to.be.gt(weth_holder_balance_before);
		// });
	});
});
