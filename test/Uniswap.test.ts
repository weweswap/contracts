import { expect } from "chai";
import hre, { ethers } from "hardhat";

import { WEWE_ADDRESS, USDC_ADDRESS } from "./constants";

describe.only("UniswapV3 Adaptor", () => {
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

		const UniswapAdaptor = await ethers.getContractFactory("UniswapV3ViaRouter");
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

        await wewe.connect(whale).transfer(mergeWithMarketAddress, ethers.parseUnits("1000", 18));

		return { uniswapAdaptor, mergeWithMarket, holder };
	}

	describe("Uni adaptors", () => {
        it.skip("Should have funded the holder account with eth", async () => {
            const { holder } = await deployFixture();
            const balance = await ethers.provider.getBalance(holder.address);
            expect(balance).to.be.gt(ethers.parseEther("1"));
        });

		it.skip("Should deploy the contract with correct params", async () => {
			const { uniswapAdaptor, mergeWithMarket } = await deployFixture();

			expect(await uniswapAdaptor.fee()).to.equal(3000);
            expect(await mergeWithMarket.getToken()).to.be.eq(USDC_ADDRESS);
		});

        it.only("Should call uniswap via the adaptor", async () => {
            const { uniswapAdaptor, holder } = await deployFixture();

            const uniswapAdaptorAddress = await uniswapAdaptor.getAddress();
            const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
            await usdc.connect(holder).approve(uniswapAdaptorAddress, ethers.MaxUint256);

            expect(await usdc.allowance(holder.address, uniswapAdaptorAddress)).to.be.eq(ethers.MaxUint256);

            // Swap 100 of the 5800 usdc for wewe via uniswap on fork at block 20820713
            await uniswapAdaptor.connect(holder).swap(ethers.parseUnits("100", 6), USDC_ADDRESS, "0x");

            // // Check the wewe balance in the contract
            // const wewe = await ethers.getContractAt("IERC20", WEWE_ADDRESS);
            // const wewe_holder_balance = await wewe.balanceOf(holder.address);
            // // const wewe_contract_balance = await wewe.balanceOf(uniswapAdaptorAddress);
            // const usdc_contract_balance = await usdc.balanceOf(uniswapAdaptorAddress);

            // expect(wewe_holder_balance).to.be.gt(0);
            // expect(usdc_contract_balance).to.be.eq(ethers.parseUnits("100", 6));
        });

		it.skip("Should merge usdc and swap via uni to wewe", async () => {
			const { uniswapAdaptor, mergeWithMarket, holder } = await deployFixture();

			// get usdc balance
            const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
            const usdc_balance = await usdc.balanceOf(holder.address);

            const wewe = await ethers.getContractAt("IERC20", WEWE_ADDRESS);
            const wewe_balance = await wewe.balanceOf(holder.address);

            // holder account should have 5800 usdc at block 20820713
            expect(usdc_balance).to.be.gt(0);
            expect(usdc_balance).to.be.eq(5800000000);

            // holder account should have 139 or so wewe at block 20820713
            expect(wewe_balance).to.be.gt(0);

            // approve the merge contract to swap usdc
            const uniswapAdaptorAddress = await uniswapAdaptor.getAddress();
            await usdc.connect(holder).approve(uniswapAdaptorAddress, ethers.MaxUint256);
            const usdc_amount_to_sell = ethers.parseUnits("100", 6);

            await mergeWithMarket.connect(holder).mergeAndSell(usdc_amount_to_sell, uniswapAdaptorAddress, "0x");
		});
	});
});
