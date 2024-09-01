import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { main as mintNewPosition } from "../scripts/mintNFTPosition";
import { main as listPositions } from "../scripts/listPositions";
import { DETERMINISTIC_MIN_HEIGHT, DETERMINISTIC_OWED_TOKEN0_AMOUNT, DETERMINISTIC_OWED_TOKEN1_AMOUNT, DETERMINISTIC_TOKEN0_AMOUNT, DETERMINISTIC_TOKEN1_AMOUNT, DETERMINISTIC_TOKENID, DETERMINISTIC_WEWE_WETH_WALLET } from "./constants";

const INonfungiblePositionManager = require('@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json').abi;
const UNI_V3_POS = '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1' 
const WEWE_ADDRESS = "0x6b9bb36519538e0C073894E964E90172E1c0B41F";
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const SWAP_ROUTER_ADDRESS = "0x2626664c2603336E57B271c5C0b26F421741e481";

describe("Migration contract", function () {
  async function deployFixture() {
    const [owner, otherAccount] = await ethers.getSigners();
    // Reset the blockchain to a deterministic state
    await ethers.provider.send("hardhat_reset", [
      {
        forking: {
          jsonRpcUrl: process.env.FORKING_URL, 
          blockNumber: DETERMINISTIC_MIN_HEIGHT, 
        },
      },
    ]);

    const accountWithFees = await ethers.getImpersonatedSigner(DETERMINISTIC_WEWE_WETH_WALLET)
    const transaction = await owner.sendTransaction({
      to: accountWithFees.address,
      value: ethers.parseEther("1.0")
    });
    await transaction.wait()
    const Migration = await ethers.getContractFactory("Migration");

    const migration = await Migration.deploy(UNI_V3_POS, SWAP_ROUTER_ADDRESS, WEWE_ADDRESS, USDC_ADDRESS, 3000);

    return { migration, owner, otherAccount, accountWithFees };
  }
  describe("Configuration", function () {
    it("Should deploy the contract with correct addresses", async function () {
      const { migration } = await loadFixture(deployFixture);
      expect(await migration.nfpm()).to.equal(UNI_V3_POS);
      expect(await migration.swapRouter()).to.equal(SWAP_ROUTER_ADDRESS);
      expect(await migration.usdc()).to.equal(USDC_ADDRESS);
    });
    it("Should revert if deployed with a zero address", async function () {
      const Migration = await ethers.getContractFactory("Migration");
      await expect(Migration.deploy(ethers.ZeroAddress, SWAP_ROUTER_ADDRESS, WEWE_ADDRESS, USDC_ADDRESS, 3000)).to.be.revertedWith("Migration: Invalid NonfungiblePositionManager address");
      await expect(Migration.deploy(UNI_V3_POS, ethers.ZeroAddress, WEWE_ADDRESS, USDC_ADDRESS, 3000)).to.be.revertedWith("_swapRouter: Invalid SwapRouter address");
    });
    it("Should be in a deterministic state of the blockchain", async function () {
      const latest = await ethers.provider.getBlock("latest")
      console.log(latest)
      expect(Number(latest?.number)).is.greaterThanOrEqual(Number(DETERMINISTIC_MIN_HEIGHT))
    })
  })
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
    it("Should handle entire flow: receiving NFT, decreasing liquidity, collecting fees, and swapping", async function () {
      const { migration, owner, accountWithFees } = await loadFixture(deployFixture)

      // Ensure the tokenId is deterministic and exists
      const positions = await listPositions(accountWithFees.address)
      const position = positions.find(position => position.id === DETERMINISTIC_TOKENID)
      const tokenId = position?.id
      expect(tokenId).to.not.be.undefined

      // Verify balances before the transfer
      expect(position?.token0).to.equal(DETERMINISTIC_TOKEN0_AMOUNT)
      expect(position?.token1).to.equal(DETERMINISTIC_TOKEN1_AMOUNT)
      expect(position?.tokensOwed0).to.equal(DETERMINISTIC_OWED_TOKEN0_AMOUNT)
      expect(position?.tokensOwed1).to.equal(DETERMINISTIC_OWED_TOKEN1_AMOUNT)

      const positionsContract = new ethers.Contract(UNI_V3_POS, INonfungiblePositionManager, accountWithFees)

      // Get contract balance of NFTs before the transfer
      const contractBalanceBefore = await positionsContract.balanceOf(await migration.getAddress())

      // Transfer the NFT to the migration contract
      const tx = await positionsContract.safeTransferFrom(await accountWithFees.getAddress(), await migration.getAddress(), tokenId)
      await tx.wait()

      // Verify the contract now holds the NFT
      const contractBalanceAfter = await positionsContract.balanceOf(await migration.getAddress())
      expect(contractBalanceAfter).is.greaterThan(contractBalanceBefore);

      // Verify that the position's liquidity has been reduced to zero
      const lpPosition = await positionsContract.positions(tokenId);
      expect(lpPosition.liquidity).to.equal(0);

      // Assuming migration contract holds the tokens, check balance of tokens inside the contract
      // const wewe = await migration.tokenToMigrate();
      
      // const token0Contract = new ethers.Contract(wewe, ['function balanceOf(address) view returns (uint256)'], ethers.provider);

      // const weweBalance = await token0Contract.balanceOf(migration.getAddress());

      // const usdcContract = new ethers.Contract(USDC_ADDRESS, ['function balanceOf(address) view returns (uint256)'], ethers.provider);
      // const usdcBalance = await usdcContract.balanceOf(migration.getAddress());
      
      // expect(weweBalance).to.be.greaterThan(0);
      // expect(usdcBalance).to.be.greaterThan(0);
    });
  });
});
