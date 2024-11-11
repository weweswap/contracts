import { expect } from "chai";
import { ethers } from "hardhat";
import { ERC20__factory } from "../typechain-types/factories/contracts/token";
import { DynamicEater__factory } from "../typechain-types";

// Contracts are deleted but these tess are still useful
describe.only("Boom Merge", () => {
	async function deployFixture() {
		// Reset the blockchain to a deterministic state
		await ethers.provider.send("hardhat_reset", [
			{
				forking: {
					jsonRpcUrl: process.env.FORKING_URL,
					blockNumber: 22248200,
				},
			},
		]);

		// deployer
		const deployer = await ethers.getImpersonatedSigner("0x0625Db97368dF1805314E68D0E63e5eB154B9AE6");

		const [owner, otherAccount] = await ethers.getSigners();
		const tokenAddress = "0xa926342d7f9324A1DbDe8F5ab77c92706f289b5d";
		const token = await ERC20__factory.connect(tokenAddress);

		// Wewe token
		const weweAddress = "0x6b9bb36519538e0C073894E964E90172E1c0B41F";
		const wewe = await ERC20__factory.connect(weweAddress);

		const vestingPeriod = 1;

		const Merge = await ethers.getContractFactory("DynamicEater");
		const merge = await Merge.deploy(weweAddress, tokenAddress, vestingPeriod);

		// Create random address for treasury
		const treasury = ethers.Wallet.createRandom().address;
		await merge.setTreasury(treasury);

		const UniswapAdaptor = await ethers.getContractFactory("UniswapV2");
		const uniswapAdaptor = await UniswapAdaptor.deploy(); // 1:1 ratio

		// Add liquidity
		const uniswapAdaptorAddress = await uniswapAdaptor.getAddress();
		await wewe.approve(uniswapAdaptorAddress, ethers.parseEther("1000000"));
		await token.approve(uniswapAdaptorAddress, ethers.parseEther("1000000"));

		// Setup tokens
		await token.transfer(otherAccount.address, ethers.parseEther("1000"));

		const mergeAddress = await merge.getAddress();

		// Fund merge with wewe
		await wewe.approve(mergeAddress, ethers.parseUnits("1000", 18));
		await merge.deposit(ethers.parseUnits("1000", 18));

		expect(await wewe.balanceOf(mergeAddress)).to.be.eq(ethers.parseUnits("1000", 18));
		await token.connect(otherAccount).approve(mergeAddress, ethers.parseEther("1000"));

		return { token, uniswapAdaptor, merge, owner, otherAccount, deployer };
	}

	describe("Merge Boomer via uni", () => {
		it("Should merge and sell", async () => {
			const { token, uniswapAdaptor, merge, owner, otherAccount, deployer } = await deployFixture();

			// Should have been setup with these values
			expect(await token.balanceOf(deployer.address)).to.be.greaterThan(0);
		});
	});
});
