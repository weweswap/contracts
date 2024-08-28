import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre, { ethers } from "hardhat";

describe("Merge Contract", function () {
  async function deployFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    const Vult = await ethers.getContractFactory("Vult");
    const Wewe = await ethers.getContractFactory("Wewe");

    const vult = await Vult.deploy("", "");
    const mockVult = await Vult.deploy("", "");

    const wewe = await Wewe.deploy();
    const mockWewe = await Wewe.deploy();

    const Merge = await ethers.getContractFactory("Merge");
    const merge = await Merge.deploy(await wewe.getAddress(), await vult.getAddress());

    return { owner, otherAccount, vult, wewe, merge, mockWewe, mockVult };
  }

  describe("Initial Setup", function () {
    it("Should set the correct initial values", async function () {
      const { merge, vult, wewe } = await loadFixture(deployFixture);
      expect(await merge.wewe()).to.equal(await wewe.getAddress());
      expect(await merge.vult()).to.equal(await vult.getAddress());
      expect(await merge.weweBalance()).to.equal(0);
      expect(await merge.vultBalance()).to.equal(0);
      expect(await merge.lockedStatus()).to.equal(0);
    });
  });

  describe("receiveApproval Function", function () {
    it("Should revert if called by a non-WEWE token", async function () {
      const { merge, mockWewe } = await loadFixture(deployFixture);
      await expect(mockWewe.approveAndCall(merge, 1000, "0x")).to.be.revertedWithCustomError(
        merge,
        "InvalidTokenReceived",
      );
    });

    it("Should revert if locked status is Locked", async function () {
      const { merge, wewe } = await loadFixture(deployFixture);
      await expect(wewe.approveAndCall(merge, 1000, "0x")).to.be.revertedWithCustomError(merge, "MergeLocked");
    });

    it("Should revert if amount is zero", async function () {
      const { merge, wewe } = await loadFixture(deployFixture);
      await merge.setLockedStatus(1);
      await expect(wewe.approveAndCall(merge, 0, "0x")).to.be.revertedWithCustomError(merge, "ZeroAmount");
    });

    it("Should correctly transfer WEWE", async function () {
      const { merge, otherAccount, wewe, vult } = await loadFixture(deployFixture);
      await merge.setLockedStatus(1);
      const weweAmount = 10000n * ethers.parseEther("1");
      const vultAmount = 10n * ethers.parseEther("1");

      const weweDeposit = 1000n * ethers.parseEther("1");
      await merge.setVirtualWeweBalance(weweAmount);

      await vult.approve(merge, weweAmount);
      await merge.deposit(vult, vultAmount);

      await wewe.transfer(otherAccount, weweDeposit);
      await wewe.connect(otherAccount).approveAndCall(merge, weweDeposit, "0x");
      // 10 / 11 amount = 0.9090909091
      // 0.9090909091+9.090909090909090910
      expect(await merge.weweBalance()).to.equal(weweDeposit);
      expect(await merge.vultBalance()).to.equal("9090909090909090910");
      expect(await vult.balanceOf(otherAccount)).to.equal("909090909090909090");
    });
  });

  describe("onApprovalReceived Function", function () {
    it("Should revert if called by a non-VULT token", async function () {
      const { merge, mockVult } = await loadFixture(deployFixture);
      await expect(mockVult.approveAndCall(merge, 100, "0x")).to.be.revertedWithCustomError(
        merge,
        "InvalidTokenReceived",
      );
    });

    it("Should revert if locked status is not TwoWay", async function () {
      const { merge, vult } = await loadFixture(deployFixture);
      await expect(vult.approveAndCall(merge, 100, "0x")).to.be.revertedWithCustomError(merge, "VultToWeweNotAllwed");
      await merge.setLockedStatus(1);
      await expect(vult.approveAndCall(merge, 100, "0x")).to.be.revertedWithCustomError(merge, "VultToWeweNotAllwed");
    });

    it("Should revert if amount is zero", async function () {
      const { merge, vult } = await loadFixture(deployFixture);
      await merge.setLockedStatus(2); // TwoWay
      await expect(vult.approveAndCall(merge, 0, "0x")).to.be.revertedWithCustomError(merge, "ZeroAmount");
    });

    it("Should correctly transfer VULT and WEWE", async function () {
      const { merge, otherAccount, wewe, vult } = await loadFixture(deployFixture);
      await merge.setLockedStatus(2);
      const weweAmount = 10000n * ethers.parseEther("1");
      const vultAmount = 10n * ethers.parseEther("1");

      const weweDeposit = 1000n * ethers.parseEther("1");
      const vultDeposit = ethers.parseEther("1") / 10n;
      await merge.setVirtualWeweBalance(weweAmount);

      await vult.approve(merge, weweAmount);
      await merge.deposit(vult, vultAmount);

      await wewe.transfer(otherAccount, weweDeposit);
      await wewe.connect(otherAccount).approveAndCall(merge, weweDeposit, "0x");
      // 10 / 11 amount = 0.9090909091
      // 0.9090909091+9.090909090909090910
      expect(await merge.weweBalance()).to.equal(weweDeposit);
      expect(await merge.vultBalance()).to.equal("9090909090909090910");
      expect(await vult.balanceOf(otherAccount)).to.equal("909090909090909090");

      // Try two-way convert
      // Get less wewe - around 119 out and 880 remaining
      await vult.connect(otherAccount).approveAndCall(merge, vultDeposit, "0x");
      expect(await merge.weweBalance()).to.equal("880316518298714144424");
      expect(await merge.vultBalance()).to.equal("9190909090909090910");
      expect(await wewe.balanceOf(otherAccount)).to.equal("119683481701285855576");
    });
  });

  describe("Deposit Function", function () {
    it("Should revert if token is not WEWE or VULT, not called from non-owner", async function () {
      const { merge, mockVult, vult, otherAccount } = await loadFixture(deployFixture);

      await expect(merge.deposit(mockVult, 100)).to.be.revertedWithCustomError(merge, "InvalidTokenReceived");
      await expect(merge.connect(otherAccount).deposit(vult, 100)).to.be.revertedWith(
        "Ownable: caller is not the owner",
      );
    });

    it("Should correctly deposit WEWE and VULT", async function () {
      const { merge, vult, wewe } = await loadFixture(deployFixture);

      const virtualBalance = 100_000n * ethers.parseEther("1");

      // For owner-deposit function, let's keep approve and call separately because, the approve received hook only handles user interactions not for owner deposits
      await wewe.approve(merge, virtualBalance * 2n);
      await vult.approve(merge, virtualBalance);

      await merge.deposit(wewe, virtualBalance * 2n);
      expect(await merge.weweBalance()).to.equal(virtualBalance * 2n);

      await merge.deposit(vult, virtualBalance);
      expect(await merge.vultBalance()).to.equal(virtualBalance);
    });
  });

  describe("Setters", function () {
    it("Should correctly set LockedStatus", async function () {
      const { merge, otherAccount } = await loadFixture(deployFixture);
      await merge.setLockedStatus(2); // TwoWay
      expect(await merge.lockedStatus()).to.equal(2);

      // Called from non-owner failed
      await expect(merge.connect(otherAccount).setLockedStatus(1)).to.be.revertedWith(
        "Ownable: caller is not the owner",
      );
    });

    it("Should correctly set VirtualWeweBalance", async function () {
      const { merge, otherAccount } = await loadFixture(deployFixture);
      const virtualBalance = 100_000_000_000n * ethers.parseEther("1");
      await merge.setVirtualWeweBalance(virtualBalance);
      expect(await merge.virtualWeweBalance()).to.equal(virtualBalance);

      // Called from non-owner failed
      await expect(merge.connect(otherAccount).setVirtualWeweBalance(virtualBalance)).to.be.revertedWith(
        "Ownable: caller is not the owner",
      );
    });
  });
});
