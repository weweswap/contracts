import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { int } from "hardhat/internal/core/params/argumentTypes";

describe("Dynamic Merge Contract", function () {
	const ONE_MILLION = ethers.parseEther("1000000");
	const WE_WE_TO_DEPOSIT = ethers.parseEther("1000000");

	async function deployFixture() {
		const [owner, otherAccount] = await ethers.getSigners();

		const Wewe = await ethers.getContractFactory("Wewe");
		const wewe = await Wewe.deploy();
		const Token = await ethers.getContractFactory("MockToken");
		const token = await Token.deploy("Token", "TKN");

		// Max supply of 1000 tokens to eat
		const vestingPeriod = 60;
		const virtualFomo = ethers.parseEther("800");
		const virtualWeWe = ethers.parseEther("1000");

		const Merge = await ethers.getContractFactory("DynamicEater");
		const merge = await Merge.deploy(await wewe.getAddress(), await token.getAddress(), vestingPeriod, virtualFomo, virtualWeWe);

		const isPaused = await merge.paused();
		expect(isPaused).to.be.false;

		await token.transfer(otherAccount, ethers.parseEther("1000000"));

		const mergeAddress = await merge.getAddress();

		// Arrange
		await wewe.approve(mergeAddress, ONE_MILLION);
		await token.connect(otherAccount).approve(mergeAddress, ONE_MILLION);

		return { owner, otherAccount, token, wewe, merge };
	}

	describe("Merge with dynamic rates", () => {
		it.only("Should get price as percent at start of bonding curve", async () => {
			const { merge } = await loadFixture(deployFixture);

			const price = await merge.getCurrentPrice();
			expect(price).to.equal(1250);
		});

		it.only("Should calcuate rates with large numbers", async () => {
			const { merge, otherAccount } = await loadFixture(deployFixture);

			// Deposit wewe to setup the merge
			await merge.deposit(ethers.parseEther("10000"));

			let totalVested = await merge.totalVested();
			expect(totalVested).to.equal(0);

			const weweAmount = await merge.calculateTokensOut(ethers.parseEther("1"));
			expect(weweAmount).to.equal(1248439450686641697n);

			// await expect(merge.connect(otherAccount).merge(ethers.parseEther("1")))
			// 	.to.emit(merge, "Merged")
			// 	.withArgs(otherAccount.address, ethers.parseEther("1"), ethers.parseEther("9"));

			// const results = [];

			// let vested = await merge.vestings(otherAccount.address);
			// // console.log(vested.amount.toString());
			// results.push(vested.amount.toString());

			// await merge.connect(otherAccount).merge(ethers.parseEther("100000"));
			// vested = await merge.vestings(otherAccount.address);
			// // console.log(vested.amount.toString());
			// results.push(vested.amount.toString());

			// await merge.connect(otherAccount).merge(ethers.parseEther("100000"));

			// vested = await merge.vestings(otherAccount.address);
			// // console.log(vested.amount.toString());
			// results.push(vested.amount.toString());

			// console.table(results);
		});
	});
});
