import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Dynamic Merge Contract", function () {
	const decimals = 18;
	const ONE_MILLION = ethers.parseUnits("1000000", decimals);
	const WE_WE_TO_DEPOSIT = ethers.parseUnits("1000000", 18);

	async function deployFixture() {
		const [owner, otherAccount] = await ethers.getSigners();

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

		const deployedVirtualFomo = await merge.virtualFOMO();
		expect(deployedVirtualFomo).to.equal(ethers.parseUnits("800", 18));

		await token.transfer(otherAccount, ethers.parseUnits("1000000", decimals));

		const mergeAddress = await merge.getAddress();

		// Arrange
		await wewe.approve(mergeAddress, ethers.parseUnits("1000000", 18));
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

			// In 10^18 we we
			let weweAmount = await merge.calculateTokensOut(ethers.parseUnits("1", decimals));
			expect(weweAmount).to.equal(1248439450686641697n);

			weweAmount = await merge.calculateTokensOut(ethers.parseUnits("1", decimals));
			expect(weweAmount).to.equal(1248439450686641697n);

			weweAmount = await merge.calculateTokensOut(ethers.parseUnits("200", decimals));
			expect(weweAmount).to.equal(200000000000000000000n);

			// weweAmount = await merge.addFOMO(ethers.parseUnits("100", 9));
			// expect(weweAmount).to.equal(111111111111111111111n);

			// weweAmount = await merge.addFOMO(ethers.parseUnits("100000", 9));
			// expect(weweAmount).to.equal(992063492063492063492n);

			// await merge.connect(otherAccount).merge(ethers.parseUnits("100000", 9));
			// totalVested = await merge.totalVested();

			// expect(totalVested).to.equal(992063492063492063492n);

			// await merge.connect(otherAccount).merge(ethers.parseUnits("100000", 9));
			// totalVested = await merge.totalVested();

			// expect(totalVested).to.equal(992063492063492063492n);

			// weweAmount = await merge.calculateTokensOut(ethers.parseEther("1"));
			// expect(weweAmount).to.equal(1248439450686641697n);
		});
	});
});
