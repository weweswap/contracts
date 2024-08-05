import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre, { ethers } from "hardhat";

describe("Merge", function () {
  let Merge, merge, owner, addr1, addr2, wewe, vult;

  beforeEach(async function () {
    // Deploy mock ERC20Vult tokens
    const ERC20Vult = await ethers.getContractFactory("MockERC20Vult");
    wewe = await ERC20Vult.deploy("Wewe", "WEWE", 18);
    vult = await ERC20Vult.deploy("Vult", "VULT", 18);

    // Deploy the Merge contract
    Merge = await ethers.getContractFactory("Merge");
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    merge = await Merge.deploy(wewe.address, vult.address);
    await merge.deployed();

    // Mint some tokens to addr1 and addr2
    await wewe.mint(addr1.address, ethers.utils.parseEther("1000"));
    await vult.mint(addr2.address, ethers.utils.parseEther("1000"));
  });

  it("should initialize with correct parameters", async function () {
    expect(await merge.wewe()).to.equal(wewe.address);
    expect(await merge.vult()).to.equal(vult.address);
  });

  it("should allow setting locked status by owner", async function () {
    await merge.setLockedStatus(1); // Assume 1 represents a valid LockedStatus enum value
    expect(await merge.lockedStatus()).to.equal(1);
  });

  it("should not allow setting locked status by non-owner", async function () {
    await expect(merge.connect(addr1).setLockedStatus(1)).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should perform wewe to vult swap", async function () {
    const amount = ethers.utils.parseEther("100");
    await wewe.connect(addr1).approve(merge.address, amount);

    await merge.connect(addr1).receiveApproval(addr1.address, amount, wewe.address, "0x");

    expect(await wewe.balanceOf(addr1.address)).to.equal(ethers.utils.parseEther("900"));
    expect(await wewe.balanceOf(merge.address)).to.equal(amount);
    expect(await vult.balanceOf(addr1.address)).to.be.gt(0); // The actual value will depend on quoteVult calculation
  });

  it("should revert if locked when performing wewe to vult swap", async function () {
    await merge.setLockedStatus(1); // Assume 1 represents LockedStatus.Locked
    const amount = ethers.utils.parseEther("100");
    await wewe.connect(addr1).approve(merge.address, amount);
    await expect(merge.connect(addr1).receiveApproval(addr1.address, amount, wewe.address, "0x")).to.be.revertedWith(
      "MergeLocked",
    );
  });

  // Additional tests for vult to wewe swap, invalid token, quoteVult, and quoteWewe functions
});
