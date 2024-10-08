import { expect } from "chai";
import hre, { ethers } from "hardhat";

import { DETERMINISTIC_MIN_HEIGHT } from "./constants";

describe.only("Uniswap Adaptor", () => {
	async function deployFixture() {
		// Reset the blockchain to a deterministic state
		await ethers.provider.send("hardhat_reset", [
			{
				forking: {
					jsonRpcUrl: process.env.FORKING_URL,
					blockNumber: DETERMINISTIC_MIN_HEIGHT,
				},
			},
		]);

        // impersonate this guy 0xEa36BDfaE0280831c1cC6Aca0E9e25C7D1ECbAf7
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: ["0xEa36BDfaE0280831c1cC6Aca0E9e25C7D1ECbAf7"],
        });

        const UniswapAdaptor = await ethers.getContractFactory("Uniswap");
        const uniswapAdaptor = await UniswapAdaptor.deploy();

		return { uniswapAdaptor };
	}

	describe("Uni adaptors", () => {
		it("Should deploy the contract with correct params", async () => {
			const { uniswapAdaptor } = await deployFixture();

			expect(await uniswapAdaptor.fee()).to.equal(3000);
		});

		// it("Should allow transfer from owner to another address", async () => {
		// 	const { chaos } = await deployFixture();

		// 	const [owner, receiver] = await ethers.getSigners();
		// 	await chaos.mint(1000);

		// 	expect(await chaos.balanceOf(owner.address)).to.equal(1000);
		// 	expect(await chaos.totalSupply()).to.equal(1000);

		// 	await expect(chaos.transfer(receiver.address, 2000)).to.be.revertedWith("ERC20: transfer amount exceeds balance");

		// 	await chaos.transfer(receiver.address, 100);

		// 	expect(await chaos.balanceOf(owner.address)).to.equal(900);
		// 	expect(await chaos.balanceOf(receiver.address)).to.equal(100);
		// });
	});
});
