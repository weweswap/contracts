import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Dynamic Merge Contract", function () {
	const maxSupply = ethers.parseEther("600000");
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
		const Merge = await ethers.getContractFactory("DynamicEater");
		const merge = await Merge.deploy(await wewe.getAddress(), await token.getAddress(), vestingPeriod, maxSupply);

		const isPaused = await merge.paused();
		expect(isPaused).to.be.false;

		await token.transfer(otherAccount, WE_WE_TO_DEPOSIT);

		const mergeAddress = await merge.getAddress();

		// Arrange
		await wewe.approve(mergeAddress, ONE_MILLION);
		await token.connect(otherAccount).approve(mergeAddress, ONE_MILLION);

		return { owner, otherAccount, token, wewe, merge };
	}

	describe("Merge with dynamic rates", () => {
		// // Working with small value
		// it.only("Should decrease deposit rates", async () => {
		// 	const { merge, token, wewe, otherAccount } = await loadFixture(deployFixture);

		// 	const mergeAddress = await merge.getAddress();

		// 	let rate = await merge.getRate();
		// 	expect(rate).to.be.eq(12000000000n); // Starting rate should be 120%

		// 	await merge.deposit(1000n);

		// 	let totalVested = await merge.totalVested();
		// 	expect(totalVested).to.be.eq(0);

		// 	const slope = await merge.slope();
		// 	expect(slope).to.be.eq(116666666666n);

		// 	const reward = await merge.getTotalWeWe(100n);
		// 	expect(reward).to.be.eq(120000116666666666n);

		// 	// // Merge 100 vult to wewe
		// 	// await merge.connect(otherAccount).merge(100n);
		// 	// const vested = await merge.vestings(otherAccount.address);

		// 	// expect(vested.amount).to.be.eq(50n);
		// });

		it.only("Should decrease deposit rates with large numbers", async () => {
			const { merge, token, wewe, otherAccount } = await loadFixture(deployFixture);

			const mergeAddress = await merge.getAddress();

			// Deposit wewe to setup the merge
			await merge.deposit(WE_WE_TO_DEPOSIT);

			let scalar = await merge.getScalar(1000);
			// expect(reward).to.be.eq(120);
			expect(scalar).to.be.eq(11989);

			scalar = await merge.getScalar(10000);
			expect(scalar).to.be.approximately(11900, 100);

			// reward = await merge.getTotalWeWe(30000);
			// expect(reward).to.be.eq(117);

			// reward = await merge.getTotalWeWe(100000);
			// expect(reward).to.be.eq(109);

			scalar = await merge.getScalar(500000);
			expect(scalar).to.be.approximately(6200, 100);

			let weweRecieved = await merge.getTotalWeWe(1000);
			expect(weweRecieved).to.be.approximately(1570, 10);

			weweRecieved = await merge.getTotalWeWe(500000);
			expect(weweRecieved).to.be.approximately(403938, 10);

			console.log("wewe", weweRecieved.toString());
		});
	});
});
