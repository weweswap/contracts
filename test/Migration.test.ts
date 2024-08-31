import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { main as mintNewPosition } from "../scripts/mintNFTPosition";
import { main as listPositions } from "../scripts/listPositions";

const INonfungiblePositionManager = require('@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json').abi;
const UNI_V3_POS = '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1' 
const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";
const WEWE_ADDRESS = "0x6b9bb36519538e0C073894E964E90172E1c0B41F";


describe("Migration contract", function () {
  async function deployFixture() {
    const [owner, otherAccount] = await ethers.getSigners();
    const Migration = await ethers.getContractFactory("Migration");

    const migration = await Migration.deploy(UNI_V3_POS, WEWE_ADDRESS, WETH_ADDRESS);

    return { migration, owner, otherAccount };
  }

  describe("On receive", function () {
    it("Should revert on receiving ERC721 from an incorrect pair", async function () {
      const { migration, owner } = await loadFixture(deployFixture)
      await mintNewPosition(owner.address, '0x532f27101965dd16442E59d40670FaF5eBB142E4')
      const positions = await listPositions(owner.address)
      const positionsContract = new ethers.Contract(UNI_V3_POS, INonfungiblePositionManager, owner);
      const tokenId = positions[0].id // Assume this is an invalid liquidity position for the WEWE-WETH pair
      // Attempt to transfer the NFT to the migration contract and expect it to revert with the specified message
      await expect(
          positionsContract.safeTransferFrom(owner.address, await migration.getAddress(), tokenId)
      ).to.be.revertedWith("Invalid NFT: Not a WEWE-WETH pool token");
  });
  

    it("Should accept ERC721 for WEWE/WETH pair", async function () {
      const { migration, otherAccount } = await loadFixture(deployFixture)
      await mintNewPosition(otherAccount.address)
      const positions = await listPositions(otherAccount.address)
      const tokenId = positions[0].id // Create WEWE/WETH posstion
      const positionsContract = new ethers.Contract(UNI_V3_POS, INonfungiblePositionManager, otherAccount)
      const contractBalanceBefore = await positionsContract.balanceOf(await migration.getAddress())
      const tx = await positionsContract.safeTransferFrom(otherAccount, await migration.getAddress(), tokenId)
      await tx.wait()
      const contractBalanceAfter = await positionsContract.balanceOf(await migration.getAddress())
      expect(contractBalanceAfter).is.greaterThan(contractBalanceBefore); 
    });
  });
});
