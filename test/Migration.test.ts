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
      const tokenId = positions[0].id

      const positionsContract = new ethers.Contract(UNI_V3_POS, INonfungiblePositionManager, otherAccount)

      // Get contract balance of NFTs before the transfer
      const contractBalanceBefore = await positionsContract.balanceOf(await migration.getAddress())

      // Transfer the NFT to the migration contract
      const tx = await positionsContract.safeTransferFrom(otherAccount, await migration.getAddress(), tokenId)
      await tx.wait()

      // Verify the contract now holds the NFT
      const contractBalanceAfter = await positionsContract.balanceOf(await migration.getAddress())
      expect(contractBalanceAfter).is.greaterThan(contractBalanceBefore); 
    });

    it("Should handle multiple NFTs being sent to the contract", async function () {
      const { migration, otherAccount } = await loadFixture(deployFixture);
    
      // Mint multiple positions
      await mintNewPosition(otherAccount.address);
      await mintNewPosition(otherAccount.address);
      const positions = await listPositions(otherAccount.address);
      
      const positionsContract = new ethers.Contract(UNI_V3_POS, INonfungiblePositionManager, otherAccount);
    
      // Transfer multiple NFTs to the migration contract
      for (const position of positions) {
        const tx = await positionsContract.safeTransferFrom(otherAccount.address, await migration.getAddress(), position.id);
        await tx.wait();
      }
      
      // Verify that all NFTs are now held by the contract
      for (const position of positions) {
        const positionData = await positionsContract.positions(position.id);
        expect(positionData.liquidity).to.equal(0);
      }
    });

    it("Should empty a LP for WEWE/WETH pair", async function () {
      const { migration, otherAccount } = await loadFixture(deployFixture)
      await mintNewPosition(otherAccount.address)
      const positions = await listPositions(otherAccount.address)
      const tokenId = positions[0].id

      const positionsContract = new ethers.Contract(UNI_V3_POS, INonfungiblePositionManager, otherAccount)

      // Get contract balance of NFTs before the transfer
      const contractBalanceBefore = await positionsContract.balanceOf(await migration.getAddress()) 

      // Transfer the NFT to the migration contract
      const tx = await positionsContract.safeTransferFrom(otherAccount, await migration.getAddress(), tokenId)
      await tx.wait()

      // Verify the contract now holds the NFT
      const contractBalanceAfter = await positionsContract.balanceOf(await migration.getAddress())
      expect(contractBalanceAfter).is.greaterThan(contractBalanceBefore);

      // Verify that the position's liquidity has been reduced to zero
      const position = await positionsContract.positions(tokenId);
      expect(position.liquidity).to.equal(0);

      // Assuming migration contract holds the tokens, check balance of tokens inside the contract
      const token0 = await migration.WEWE();
      const token1 = await migration.WETH();
      
      const token0Contract = new ethers.Contract(token0, ['function balanceOf(address) view returns (uint256)'], ethers.provider);
      const token1Contract = new ethers.Contract(token1, ['function balanceOf(address) view returns (uint256)'], ethers.provider);
      
      const token0Balance = await token0Contract.balanceOf(migration.getAddress());
      const token1Balance = await token1Contract.balanceOf(migration.getAddress());
      
      expect(token0Balance).to.be.greaterThan(0);
      expect(token1Balance).to.be.greaterThan(0);
    });
  });
});
