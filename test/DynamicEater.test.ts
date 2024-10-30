import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Dynamic Merge / Eater Contract", function () {
	const decimals = 18;

	async function deployFixture() {
		const [owner, otherAccount] = await ethers.getSigners();
		console.log("otherAccount: ", otherAccount.address);

		const Wewe = await ethers.getContractFactory("Wewe");
		const wewe = await Wewe.deploy();

		const Token = await ethers.getContractFactory("MockToken2");
		const token = await Token.deploy("Token", "TKN", decimals);

		// Max supply of 1000 tokens to eat
		const vestingPeriod = 60;

		const virtualFomo = ethers.parseUnits("800", decimals);
		const virtualWeWe = ethers.parseUnits("1000", decimals);

		const Merge = await ethers.getContractFactory("DynamicEater");
		const merge = await Merge.deploy(await wewe.getAddress(), await token.getAddress(), vestingPeriod, virtualFomo, virtualWeWe);

		const isPaused = await merge.paused();
		expect(isPaused).to.be.false;

		const deployedVirtualFomo = await merge.virtualToken();
		expect(deployedVirtualFomo).to.equal(ethers.parseUnits("800", 18));

		await token.transfer(otherAccount, ethers.parseUnits("1000000", decimals));

		const mergeAddress = await merge.getAddress();

		// Arrange
		await wewe.approve(mergeAddress, ethers.parseUnits("1000000", 18));
		await token.connect(otherAccount).approve(mergeAddress, ethers.parseUnits("1000000", decimals));

		return { owner, otherAccount, token, wewe, merge };
	}

	describe("Merge with dynamic rates", () => {
		it("Should get price as percent at start of bonding curve", async () => {
			const { merge } = await loadFixture(deployFixture);

			const price = await merge.getCurrentPrice();
			expect(price).to.equal(1250);
		});

		it("Should calculate rates with large numbers", async () => {
			const { merge, otherAccount } = await loadFixture(deployFixture);

			// Deposit wewe to setup the merge
			await merge.deposit(ethers.parseEther("10000"));

			let totalVested = await merge.totalVested();
			expect(totalVested).to.equal(0);

			// In 10^18 we we
			let weweAmount = await merge.calculateTokensOut(ethers.parseUnits("1", decimals));
			expect(weweAmount).to.equal(1248439450686641697n);

			weweAmount = await merge.calculateTokensOut(ethers.parseUnits("1", decimals));
			expect(weweAmount).to.equal(1248439450686641697n);

			weweAmount = await merge.calculateTokensOut(ethers.parseUnits("200", decimals));
			expect(weweAmount).to.equal(200000000000000000000n);

			weweAmount = await merge.calculateTokensOut(ethers.parseUnits("500", decimals));
			expect(weweAmount).to.equal(384615384615384615384n);

			await merge.connect(otherAccount).merge(ethers.parseUnits("100000", 9));
			totalVested = await merge.totalVested();
		});

		it("Should merge before max supply and not after max supply", async () => {
			const { merge, otherAccount } = await loadFixture(deployFixture);

			// Deposit wewe to setup the merge
			await merge.deposit(ethers.parseEther("10000"));
			await merge.setMaxSupply(ethers.parseUnits("100000", decimals));

			await merge.connect(otherAccount).merge(ethers.parseUnits("100000", decimals));

			// Tokens
			let totalVested = await merge.totalVested();
			expect(totalVested).to.be.greaterThan(0);

			await expect(merge.connect(otherAccount).merge(ethers.parseUnits("1", 9))).to.be.revertedWith("whenLessThanMaxSupply: More than max supply");

			// Turn off max supply
			await merge.setMaxSupply(0);

			await merge.connect(otherAccount).merge(ethers.parseUnits("100000", decimals));
			totalVested = await merge.totalVested();

			expect(totalVested).to.be.greaterThan(0);
		});

		it.only("Should be able to merge when merkle root is bytes 0", async () => {
			const { merge, otherAccount } = await loadFixture(deployFixture);

			await expect(merge.connect(otherAccount).merge(ethers.parseUnits("10", decimals))).to.emit(merge, "Merged");

			let totalVested = await merge.totalVested();
			expect(totalVested).to.be.greaterThan(0);

			// await merge.setMerkleRoot("0x
		});
	});
});
