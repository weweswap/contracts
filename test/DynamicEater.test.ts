import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Dynamic Merge / Eater Contract", function () {
	const decimals = 18;

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
			let totalMerged = await merge.totalMerged();
			expect(totalVested).to.be.greaterThan(0);
			expect(totalMerged).to.eq(100000000000000000000000n);

			await expect(merge.connect(otherAccount).merge(ethers.parseUnits("1", 9))).to.be.revertedWith("_merge: More than max supply");

			// Turn off max supply
			await merge.setMaxSupply(0);

			await merge.connect(otherAccount).merge(ethers.parseUnits("100000", decimals));
			totalVested = await merge.totalVested();
			totalMerged = await merge.totalMerged();

			expect(totalVested).to.be.greaterThan(0);
			expect(totalMerged).to.eq(200000000000000000000000n);
		});

		it("Should be able to merge when merkle root is bytes 0", async () => {
			const { merge, otherAccount } = await loadFixture(deployFixture);

			await merge.deposit(ethers.parseEther("10000"));

			const amount = ethers.parseUnits("100", decimals);
			await expect(merge.connect(otherAccount).merge(amount)).to.emit(merge, "Merged");
		});

		it("Should be able to merge with proof", async () => {
			const { merge, otherAccount } = await loadFixture(deployFixture);

			await merge.deposit(ethers.parseEther("10000"));

			let totalVested = await merge.totalVested();
			expect(totalVested).to.be.eq(0);

			await merge.setMerkleRoot("0x403ff023bd4c929b68c940e8c21016d996bdd7b4ddd73cd42e82b2de3a8bcca3");
			const proof = ["0x28dca11b2244051b40a1b04eadce9617f1274a546431424e61362b8de7dddf89"];

			await expect(merge.connect(otherAccount).mergeWithProof(10000, 1000, proof)).to.revertedWith("onlyWhiteListed: Invalid proof");
			await expect(merge.connect(otherAccount).mergeWithProof(1000, 1000, proof)).to.emit(merge, "Merged");

			totalVested = await merge.totalVested();
			const totalMerged = await merge.totalMerged();

			expect(totalVested).to.be.greaterThan(0);
			expect(totalMerged).to.eq(1000);
		});

		it("Should be able to merge multiple times with proof", async () => {
			const { merge, otherAccount } = await loadFixture(deployFixture);

			await merge.deposit(ethers.parseEther("10000"));

			let totalVested = await merge.totalVested();
			let totalMerged = await merge.totalMerged();
			expect(totalVested).to.be.eq(0);
			expect(totalMerged).to.be.eq(0);

			await merge.setMerkleRoot("0x403ff023bd4c929b68c940e8c21016d996bdd7b4ddd73cd42e82b2de3a8bcca3");
			const proof = ["0x28dca11b2244051b40a1b04eadce9617f1274a546431424e61362b8de7dddf89"];

			await expect(merge.connect(otherAccount).mergeWithProof(1000, 100, proof)).to.emit(merge, "Merged");

			totalVested = await merge.totalVested();
			totalMerged = await merge.totalMerged();
			let vested = await merge.vestings(otherAccount.address);

			expect(totalVested).to.be.greaterThan(0);
			expect(totalMerged).to.eq(100);
			expect(vested.merged).to.eq(100);
			expect(vested.amount).to.eq(124);

			await expect(merge.connect(otherAccount).mergeWithProof(1000, 100, proof)).to.emit(merge, "Merged");

			totalMerged = await merge.totalMerged();
			vested = await merge.vestings(otherAccount.address);
			expect(totalMerged).to.eq(200);
			expect(vested.merged).to.eq(200);
			expect(vested.amount).to.eq(248);

			await expect(merge.connect(otherAccount).mergeWithProof(1000, 800, proof)).to.emit(merge, "Merged");
			totalMerged = await merge.totalMerged();
			vested = await merge.vestings(otherAccount.address);
			expect(totalMerged).to.eq(1000);
			expect(vested.merged).to.eq(1000);

			await expect(merge.connect(otherAccount).mergeWithProof(1000, 1, proof)).to.be.revertedWith("onlyWhiteListed: Already merged");
		});

		it.only("Should be perform partial merges", async () => {
			const { merge, otherAccount } = await loadFixture(deployFixture);

			await merge.deposit(ethers.parseEther("10000"));

			let totalVested = await merge.totalVested();
			let totalMerged = await merge.totalMerged();
			expect(totalVested).to.be.eq(0);
			expect(totalMerged).to.be.eq(0);

			await merge.setMerkleRoot("0x403ff023bd4c929b68c940e8c21016d996bdd7b4ddd73cd42e82b2de3a8bcca3");
			const proof = ["0x28dca11b2244051b40a1b04eadce9617f1274a546431424e61362b8de7dddf89"];

			await expect(merge.connect(otherAccount).mergeWithProof(1000, 500, proof))
				.to.emit(merge, "Merged")
				.withArgs(otherAccount.address, 500);

			// totalVested = await merge.totalVested();
			// totalMerged = await merge.totalMerged();
			// let vested = await merge.vestings(otherAccount.address);

			// expect(totalVested).to.be.greaterThan(0);
			// expect(totalMerged).to.eq(500);
			// expect(vested.merged).to.eq(500);

			// await expect(merge.connect(otherAccount).mergeWithProof(1000, 1000, proof))
			// 	.to.emit(merge, "Merged")
			// 	.withArgs(otherAccount.address, 500);

			// totalMerged = await merge.totalMerged();
			// vested = await merge.vestings(otherAccount.address);
			// expect(totalMerged).to.eq(1000);
			// expect(vested.merged).to.eq(1000);
		});

		it("Should not be able to replay proof", async () => {
			const { merge, otherAccount } = await loadFixture(deployFixture);

			await merge.deposit(ethers.parseEther("10000"));

			let totalVested = await merge.totalVested();
			expect(totalVested).to.be.eq(0);

			await merge.setMerkleRoot("0x403ff023bd4c929b68c940e8c21016d996bdd7b4ddd73cd42e82b2de3a8bcca3");
			const proof = ["0x28dca11b2244051b40a1b04eadce9617f1274a546431424e61362b8de7dddf89"];

			await expect(merge.connect(otherAccount).mergeWithProof(1000, 1000, proof)).to.emit(merge, "Merged");

			// Replay proof
			await expect(merge.connect(otherAccount).mergeWithProof(1000, 1000, proof)).to.revertedWith("onlyWhiteListed: Already merged");
		});
	});
});
