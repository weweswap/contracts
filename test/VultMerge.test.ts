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

		const Merge = await ethers.getContractFactory("VultMerge");
		const merge = await Merge.deploy(await wewe.getAddress(), await vult.getAddress(), 60);

		await vult.transfer(otherAccount, ethers.parseEther("1000"));

		const mergeAddress = await merge.getAddress();

		// Arrange
		await wewe.approve(mergeAddress, ethers.parseEther("1000"));
		await vult.connect(otherAccount).approve(mergeAddress, ethers.parseEther("1000"));

		return { owner, otherAccount, vult, wewe, merge, mockWewe, mockVult };
	}

	describe("Initial Setup", function () {
		it.skip("Should set the correct initial values", async function () {
			const { merge, vult, wewe } = await loadFixture(deployFixture);
			expect(await merge.wewe()).to.equal(await wewe.getAddress());
			expect(await merge.vult()).to.equal(await vult.getAddress());
			expect(await merge.weweBalance()).to.equal(0);
			expect(await merge.vultBalance()).to.equal(0);
			expect(await merge.lockedStatus()).to.equal(0);
		});
	});

	describe("Vult merge with dynamic rates", () => {
		it("Should decrease deposit rates", async () => {
			const { merge, vult, wewe, otherAccount } = await loadFixture(deployFixture);

			const mergeAddress = await merge.getAddress();

			let rate = await merge.getRate();
			expect(rate).to.be.eq(0);

			// Deposit 1000 wewe to setup the merge
			await merge.deposit(ethers.parseEther("1000"));

			expect(await wewe.balanceOf(mergeAddress)).to.be.eq(ethers.parseEther("1000"));

			// Other account should have 1000 vult
			expect(await vult.balanceOf(otherAccount.address)).to.be.eq(ethers.parseEther("1000"));

			//await merge.connect(otherAccount).merge(ethers.parseEther("100"));
			rate = await merge.getRate();
			expect(rate).to.be.eq(12000000n); // 120%

			await merge.connect(otherAccount).merge(ethers.parseEther("100"));
		});
	});
});
