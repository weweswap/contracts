import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { main as mintNewPosition } from "../scripts/mintNFTPosition";
import { main as listPositions } from "../scripts/listPositions";
import { main as setPoolConfiguration } from "../scripts/setPoolConfiguration";
import { main as deployTokenLiquidityManager } from "../scripts/deployTokenLiquidityManager";
import { DETERMINISTIC_FEE0_AMOUNT, DETERMINISTIC_FEE1_AMOUNT, DETERMINISTIC_MIN_HEIGHT, DETERMINISTIC_OWED_TOKEN0_AMOUNT, DETERMINISTIC_OWED_TOKEN1_AMOUNT, DETERMINISTIC_TOKENID, DETERMINISTIC_WEWE_WETH_WALLET, DETERMINSITIC_LIQUIDITY } from "./constants";

const INonfungiblePositionManager = require('@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json').abi;

const UNI_V3_POS = '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1';
const UNISWAP_V3_FACTORY_ADDRESS = '0x33128a8fC17869897dcE68Ed026d694621f6FDfD';
const WEWE_ADDRESS = "0x6b9bb36519538e0C073894E964E90172E1c0B41F";
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const KYBERSWAP_ZAP_ROUTER_ADDRESS = '0x0e97C887b61cCd952a53578B04763E7134429e05';
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

    const LiquidityManagerFactory = await ethers.getContractFactory('LiquidityManagerFactory')
    const liquidityManagerFactory = await LiquidityManagerFactory.deploy(
      UNISWAP_V3_FACTORY_ADDRESS,
      KYBERSWAP_ZAP_ROUTER_ADDRESS,
      UNI_V3_POS,
      USDC_ADDRESS
    )
    const lmfAddress = await liquidityManagerFactory.getAddress()

    await setPoolConfiguration(lmfAddress, 0, { targetPriceDelta: 100, narrowRange: 4000, midRange: 10000, wideRange: 17000, fee: 500 })
    await setPoolConfiguration(lmfAddress, 1, { targetPriceDelta: 1000, narrowRange: 4000, midRange: 10000, wideRange: 17000, fee: 3000 })
    await setPoolConfiguration(lmfAddress, 2, { targetPriceDelta: 5000, narrowRange: 4000, midRange: 10000, wideRange: 17000, fee: 10000 })

    await deployTokenLiquidityManager(lmfAddress, WEWE_ADDRESS, 2)

    const accountWithFees = await ethers.getImpersonatedSigner(DETERMINISTIC_WEWE_WETH_WALLET)
    const transaction = await owner.sendTransaction({
      to: accountWithFees.address,
      value: ethers.parseEther("1.0")
    });
    await transaction.wait()

    const Migration = await ethers.getContractFactory("Migration");
    const migration = await Migration.deploy(UNI_V3_POS, SWAP_ROUTER_ADDRESS, lmfAddress, WEWE_ADDRESS, USDC_ADDRESS, 3000);

    return { migration, owner, otherAccount, accountWithFees, liquidityManagerFactory };
  }
  describe("Configuration", function () {
    it("Should deploy the contract with correct addresses", async function () {
      const { migration } = await loadFixture(deployFixture);
      expect(await migration.nfpm()).to.equal(UNI_V3_POS);
      expect(await migration.swapRouter()).to.equal(SWAP_ROUTER_ADDRESS)
      expect(await migration.tokenToMigrate()).to.equal(WEWE_ADDRESS)
      expect(await migration.usdc()).to.equal(USDC_ADDRESS);
    });
    it("Should revert if deployed with a zero address", async function () {
      const LiquidityManagerFactory = await ethers.getContractFactory('LiquidityManagerFactory')
      const liquidityManagerFactory = await LiquidityManagerFactory.deploy(
        UNISWAP_V3_FACTORY_ADDRESS,
        KYBERSWAP_ZAP_ROUTER_ADDRESS,
        UNI_V3_POS,
        USDC_ADDRESS
      )
      const lmfAddress = await liquidityManagerFactory.getAddress()

      const Migration = await ethers.getContractFactory("Migration");
      await expect(Migration.deploy(ethers.ZeroAddress, SWAP_ROUTER_ADDRESS, lmfAddress, WEWE_ADDRESS, USDC_ADDRESS, 3000)).to.be.revertedWith("Migration: Invalid NonfungiblePositionManager address");
      await expect(Migration.deploy(UNI_V3_POS, ethers.ZeroAddress, lmfAddress, WEWE_ADDRESS, USDC_ADDRESS, 3000)).to.be.revertedWith("Migration: Invalid SwapRouter address");
      await expect(Migration.deploy(UNI_V3_POS, SWAP_ROUTER_ADDRESS, ethers.ZeroAddress, WEWE_ADDRESS, USDC_ADDRESS, 3000)).to.be.revertedWith("Migration: Invalid Liquidity Manager Factory address");
    });
    it("Should be in a deterministic state of the blockchain", async function () {
      const latest = await ethers.provider.getBlock("latest")
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
      ).to.be.revertedWith("Invalid NFT: Does not have the correct token");
    });  
    it("Should accept ERC721 for WEWE/WETH pair", async function () {
      const { migration, otherAccount } = await loadFixture(deployFixture)
      await mintNewPosition(otherAccount.address)
      const positions = await listPositions(otherAccount.address)
      const tokenId = positions[0].id

			const positionsContract = new ethers.Contract(UNI_V3_POS, INonfungiblePositionManager, otherAccount);

			// Get contract balance of NFTs before the transfer
			const contractBalanceBefore = await positionsContract.balanceOf(await migration.getAddress());

			// Transfer the NFT to the migration contract
			const tx = await positionsContract.safeTransferFrom(otherAccount, await migration.getAddress(), tokenId);
			await tx.wait();

			// Verify the contract now holds the NFT
			const contractBalanceAfter = await positionsContract.balanceOf(await migration.getAddress());
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
			const { migration, owner, accountWithFees } = await loadFixture(deployFixture);

			// Ensure the tokenId is deterministic and exists
			const positions = await listPositions(accountWithFees.address);
			const position = positions.find(position => position.id === DETERMINISTIC_TOKENID);
			if (!position) {
				throw new Error("Position with the deterministic token ID not found.");
			}
			const tokenId = position?.id;
			expect(tokenId).to.not.be.undefined;

			// Verify balances before the transfer
			expect(position.liquidity).to.equal(DETERMINSITIC_LIQUIDITY);
			expect(position.feeGrowthInside0LastX128).to.equal(DETERMINISTIC_FEE0_AMOUNT);
			expect(position.feeGrowthInside1LastX128).to.equal(DETERMINISTIC_FEE1_AMOUNT);

			const positionsContract = new ethers.Contract(UNI_V3_POS, INonfungiblePositionManager, accountWithFees);

			// Get contract balance of NFTs before the transfer
			const contractBalanceBefore = await positionsContract.balanceOf(await migration.getAddress());

			// Transfer the NFT to the migration contract
			const tx = await positionsContract.safeTransferFrom(await accountWithFees.getAddress(), await migration.getAddress(), tokenId);
			await tx.wait();

			// Verify the contract now holds the NFT
			const contractBalanceAfter = await positionsContract.balanceOf(await migration.getAddress());
			expect(contractBalanceAfter).is.greaterThan(contractBalanceBefore);

			// Verify that the position's liquidity has been reduced to zero
			const lpPosition = await positionsContract.positions(tokenId);
			expect(lpPosition.liquidity).to.equal(0);

			// Assuming migration contract holds the tokens, check balance of tokens inside the contract
			const wewe = await migration.tokenToMigrate();
			const token0Contract = new ethers.Contract(wewe, ["function balanceOf(address) view returns (uint256)"], ethers.provider);
			const usdcContract = new ethers.Contract(USDC_ADDRESS, ["function balanceOf(address) view returns (uint256)"], ethers.provider);

			const weweBalance = await token0Contract.balanceOf(migration.getAddress());
			const usdcBalance = await usdcContract.balanceOf(migration.getAddress());

			expect(weweBalance).to.equal(DETERMINISTIC_OWED_TOKEN1_AMOUNT);
			expect(usdcBalance).to.equal(DETERMINISTIC_OWED_TOKEN0_AMOUNT);
		});
	});
});
