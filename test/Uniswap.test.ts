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

		const Adaptor = await ethers.getContractFactory("Fomo");
		const adaptor = await Adaptor.deploy();

		const fomo = await ethers.getContractAt("IERC20", "0xd327d36EB6E1f250D191cD62497d08b4aaa843Ce");
		const weth = await ethers.getContractAt("IERC20", WETH_ADDRESS);
		const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
		const wewe = await ethers.getContractAt("IERC20", WEWE_ADDRESS);
		const holder = await ethers.getSigner(test_holder);

		return { adaptor, holder, fomo, weth, usdc, wewe };
	}

	describe.only("FOMO", () => {
		it("Should test route", async () => {
			const { adaptor, holder, fomo, weth, usdc, wewe } = await deployFixture();
			
			const balance = await fomo.balanceOf(holder.address);
			expect(balance).to.be.gt(ethers.parseUnits("1", 9));

			const adaptor_address = await adaptor.getAddress();
			console.log(adaptor_address);
			const fomo_address = await fomo.getAddress();

			await fomo.connect(holder).approve(adaptor_address, ethers.parseUnits("100", 9));

			const allowance = await fomo.allowance(holder.address, "0x7bCD8185B7f4171017397993345726E15457B1eE");
			expect(allowance).to.be.eq(100000000000000);

			await adaptor.connect(holder).sell(ethers.parseUnits("1", 9), fomo_address, holder.address, "0x");

			const balance_after = await fomo.balanceOf(holder.address);
			expect(balance_after).to.be.lt(balance);

			const balance_adaptor = await fomo.balanceOf(adaptor_address);
			expect(balance_adaptor).to.be.eq(0);

			// we wont have this in the end
			const weth_balance = await weth.balanceOf(adaptor_address);
			expect(weth_balance).to.be.eq(0);

			const usdc_balance = await usdc.balanceOf(adaptor_address);
			expect(usdc_balance).to.be.eq(0);

			const wewe_balance = await wewe.balanceOf(adaptor_address);
			expect(wewe_balance).to.be.eq(0);

			// we we should be in the treasury
			const treasury_balance = await wewe.balanceOf("0xe92E74661F0582d52FC0051aedD6fDF4d26A1F86");
			expect(treasury_balance).to.be.gt(0);
		});
	});
});
