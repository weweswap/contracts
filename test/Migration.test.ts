import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre, { ethers } from "hardhat";
const INonfungiblePositionManager = require('@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json').abi;

describe("Migration contract", function () {
  async function deployFixture() {
    const [owner, otherAccount] = await ethers.getSigners();
    const Migration = await ethers.getContractFactory("Migration");

    const migration = await Migration.deploy();

    return { migration, owner, otherAccount };
  }

  describe("Initial Setup", function () {
    it("Should set the correct initial values", async function () {
      const { migration, owner } = await loadFixture(deployFixture);
      const tokenId = 888441
    });
  });
});
