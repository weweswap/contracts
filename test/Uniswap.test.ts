import { expect } from "chai";
import hre, { ethers } from "hardhat";

import { WEWE_ADDRESS, USDC_ADDRESS } from "./constants";

describe("UniswapV3 Adaptor", () => {
	async function deployFixture(TYPE: string = "UniswapV3ViaRouter") {
		// Reset the blockchain to a deterministic state
		await ethers.provider.send("hardhat_reset", [
			{
				forking: {
					jsonRpcUrl: process.env.FORKING_URL,
					blockNumber: 20820713,
				},
			},
		]);

        const base_bridge = "0x4200000000000000000000000000000000000006";
		const test_holder = "0xEa36BDfaE0280831c1cC6Aca0E9e25C7D1ECbAf7";

		// impersonate this guy 0xEa36BDfaE0280831c1cC6Aca0E9e25C7D1ECbAf7
		await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [test_holder],
		});

        await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [base_bridge],
		});

		const holder = await hre.ethers.getSigner(test_holder);
        const bridge = await hre.ethers.getSigner(base_bridge);

        // send some eth to the holder to be able to interact with the contract
        await bridge.sendTransaction({
            to: await holder.getAddress(),
            value: ethers.parseEther("10"),
        });

		const UniswapAdaptor = await ethers.getContractFactory(TYPE);
		const uniswapAdaptor = await UniswapAdaptor.deploy();

		const MergeWithMarket = await ethers.getContractFactory("MergeWithMarket");

        // Make USDC the token for this test as we're testing uni on a fork at block 20820713
		const mergeWithMarket = await MergeWithMarket.deploy(WEWE_ADDRESS, USDC_ADDRESS);
        const mergeWithMarketAddress = await mergeWithMarket.getAddress();

        // Fund the merge contract with some wewe
        const wewe = await ethers.getContractAt("IERC20", WEWE_ADDRESS);

        // we we whale 0x5396c2D02e28603444cD17747234285C6702Be3c
        const wewe_whale = "0x5396c2D02e28603444cD17747234285C6702Be3c";
        await hre.network.provider.request({
			method: "hardhat_impersonateAccount",
			params: [wewe_whale],
		});

        const whale = await hre.ethers.getSigner(wewe_whale);
        expect(await wewe.balanceOf(whale.address)).to.be.gt(ethers.parseUnits("1000", 18));

        // Fund the merge contract with some wewe
        await wewe.connect(whale).transfer(mergeWithMarketAddress, ethers.parseUnits("1000", 18));

		return { uniswapAdaptor, mergeWithMarket, holder };
	}

	describe("Uni adaptors", () => {
        it("Should have funded the holder account with ETH", async () => {
            const { holder } = await deployFixture();
            const balance = await ethers.provider.getBalance(holder.address);
            expect(balance).to.be.gt(ethers.parseEther("1"));
        });

		it("Should deploy the contract with correct params", async () => {
			const { uniswapAdaptor, mergeWithMarket } = await deployFixture();

			expect(await uniswapAdaptor.fee()).to.equal(10000);
            expect(await mergeWithMarket.getToken()).to.be.eq(USDC_ADDRESS);
		});

        it("Should call uniswap router via the adaptor", async () => {
            const { uniswapAdaptor, holder } = await deployFixture("UniswapV3ViaRouter");

            // On fork at block 20820713, we will simulate the token to merge as USDC
            const token = await ethers.getContractAt("IERC20", USDC_ADDRESS);
            const wewe = await ethers.getContractAt("IERC20", WEWE_ADDRESS);
            const uniswapAdaptorAddress = await uniswapAdaptor.getAddress();

            // Should have 0 tokens in the contract, and holder have 139 wewe at block 20820713
            const token_balance = await token.balanceOf(uniswapAdaptorAddress);
            expect(token_balance).to.be.eq(0);

            const wewe_holder_balance_before = await wewe.balanceOf(holder.address);
            expect(wewe_holder_balance_before).to.approximately(1393889258709920656678738n, 10000n);

            // Approve the uniswap adaptor to spend the holder's tokens
            await token.connect(holder).approve(uniswapAdaptorAddress, ethers.MaxUint256);
            expect(await token.allowance(holder.address, uniswapAdaptorAddress)).to.be.eq(ethers.MaxUint256);

            // Swap 100 of the 5800 usdc for wewe via uniswap on fork at block 20820713
            await uniswapAdaptor.connect(holder).swap(ethers.parseUnits("100", 6), USDC_ADDRESS, holder.address, "0x");

            // Check the wewe balance after the swap
            const wewe_holder_balance_after = await wewe.balanceOf(holder.address);
            expect(wewe_holder_balance_after).to.be.gt(wewe_holder_balance_before);
        });

		it("Should merge Token and swap via uni to wewe", async () => {
			const { uniswapAdaptor, mergeWithMarket, holder } = await deployFixture("UniswapV3ViaRouter");

			// On fork at block 20820713, we will simulate the token to merge as USDC
            const token = await ethers.getContractAt("IERC20", USDC_ADDRESS);
            const wewe = await ethers.getContractAt("IERC20", WEWE_ADDRESS);

            const token_balance = await token.balanceOf(holder.address);
            const wewe_balance = await wewe.balanceOf(holder.address);

            // holder account should have 5800 usdc at block 20820713
            expect(token_balance).to.be.eq(5800000000);

            // holder account should have 139 or so wewe at block 20820713
            expect(wewe_balance).to.approximately(1393889258709920656678738n, 10000n);

            // approve the merge contract to swap usdc
            const uniswapAdaptorAddress = await uniswapAdaptor.getAddress();
            const mergeWithMarketAddress = await mergeWithMarket.getAddress();
            
            await token.connect(holder).approve(uniswapAdaptorAddress, ethers.MaxUint256);
            await token.connect(holder).approve(mergeWithMarketAddress, ethers.MaxUint256);

            const token_amount = ethers.parseUnits("100", 6);

            await mergeWithMarket.connect(holder).mergeAndSell(token_amount, uniswapAdaptorAddress, "0x");

            // Check the token balance after the swap.  Should be 0 as they were all swapped
            const merge_balance_after = await token.balanceOf(mergeWithMarketAddress);
            expect(merge_balance_after).to.be.eq(0);

            // Check the wewe balance after the swap
            const wewe_merge_balance_after = await wewe.balanceOf(mergeWithMarketAddress);
            expect(wewe_merge_balance_after).to.be.gt(0);

            const holder_balance = await token.balanceOf(holder.address);
            expect(holder_balance).to.be.gt(0);
		});
	});
});
