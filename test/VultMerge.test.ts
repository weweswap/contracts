import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe.only("Vult Merge Contract", function () {
	async function deployFixture() {
		const [owner, otherAccount] = await ethers.getSigners();

		const Vult = await ethers.getContractFactory("Vult");
		const Wewe = await ethers.getContractFactory("Wewe");

		const vult = await Vult.deploy("", "");
		const mockVult = await Vult.deploy("", "");

		const wewe = await Wewe.deploy();
		const mockWewe = await Wewe.deploy();

		// Max supply of 1000 tokens to eat
		const maxSupply = ethers.parseEther("1000");
		const vestingPeriod = 60;
		const Merge = await ethers.getContractFactory("VultMerge");
		const merge = await Merge.deploy(await wewe.getAddress(), await vult.getAddress(), vestingPeriod, maxSupply);

		const isPaused = await merge.paused();
		expect(isPaused).to.be.false;

		await vult.transfer(otherAccount, ethers.parseEther("1000"));

		const mergeAddress = await merge.getAddress();

		// Arrange
		await wewe.approve(mergeAddress, ethers.parseEther("1000000"));
		await vult.connect(otherAccount).approve(mergeAddress, ethers.parseEther("1000000"));

		return { owner, otherAccount, vult, wewe, merge, mockWewe, mockVult };
	}

	describe("Initial Setup", function () {
		it.skip("Should set the correct initial values", async function () {
			const { merge, vult, wewe } = await loadFixture(deployFixture);
			expect(await merge.wewe()).to.equal(await wewe.getAddress());
			expect(await merge.vult()).to.equal(await vult.getAddress());
			expect(await merge.weweBalance()).to.equal(0);
			expect(await merge.lockedStatus()).to.equal(0);
		});
	});

	describe("Vult merge with dynamic rates", () => {
		it("Should decrease deposit rates", async () => {
			const { merge, vult, wewe, otherAccount } = await loadFixture(deployFixture);

			const mergeAddress = await merge.getAddress();

			let rate = await merge.getRate();
			expect(rate).to.be.eq(12000000n); // Starting rate should be 120%

			// Deposit 1200 wewe to setup the merge
			await merge.deposit(ethers.parseEther("1000"));

			expect(await wewe.balanceOf(mergeAddress)).to.be.eq(ethers.parseEther("1000"));

			// Other account should have 1000 vult
			expect(await vult.balanceOf(otherAccount.address)).to.be.eq(ethers.parseEther("1000"));

			let totalVested = await merge.totalVested();
			expect(totalVested).to.be.eq(0);

			const slope = await merge.slope();
			expect(slope).to.be.eq(-70);

			// rate = await merge.getRate();
			// expect(rate).to.be.eq(10000000n);

			// // Merge 100 vult to wewe
			await merge.connect(otherAccount).merge(ethers.parseEther("100"));
			const vested = await merge.vestings(otherAccount.address);

			console.log(vested);

			// expect(vested.amount).to.be.eq(ethers.parseEther("850"));
		});
	});
});
