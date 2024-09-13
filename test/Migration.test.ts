import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { main as mintNewPosition } from "../scripts/mintNFTPosition";
import { main as listPositions } from "../scripts/listPositions";
import {
	DETERMINISTIC_MIN_HEIGHT,
	DETERMINISTIC_WEWE_WETH_WALLET,
	ARRAKIS_V2_ADDRESS,
	ARRAKIS_V2_RESOLVER_ADDRESS,
	UNI_V3_POS,
	SWAP_ROUTER_ADDRESS,
	WEWE_ADDRESS,
	USDC_ADDRESS,
} from "./constants";

const INonfungiblePositionManager = require("@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json").abi;

describe("Migration contract", function () {
	async function deployFixture() {
		const [owner, otherAccount] = await ethers.getSigners();

		// Reset the blockchain to a deterministic state
		await ethers.provider.send("hardhat_reset", [
			{
				forking: {
					jsonRpcUrl: process.env.FORKING_URL,
					// blockNumber: DETERMINISTIC_MIN_HEIGHT,
				},
			},
		]);

		const accountWithFees = await ethers.getImpersonatedSigner(DETERMINISTIC_WEWE_WETH_WALLET);
		const transaction = await owner.sendTransaction({
			to: accountWithFees.address,
			value: ethers.parseEther("1.0"),
		});
		await transaction.wait();

		const MockResolverV2 = await ethers.getContractFactory("MockResolverV2");
    	const resolverV2Mock = await MockResolverV2.deploy();

		const MockArrakisV2 = await ethers.getContractFactory("MockArrakisV2");
		const arrakisV2Mock = await MockArrakisV2.deploy();

		const Migration = await ethers.getContractFactory("Migration");
		const migration = await Migration.deploy(UNI_V3_POS, SWAP_ROUTER_ADDRESS, await arrakisV2Mock.getAddress(), await resolverV2Mock.getAddress(), WEWE_ADDRESS, USDC_ADDRESS, 3000);
		// const migration = await Migration.deploy(UNI_V3_POS, SWAP_ROUTER_ADDRESS, ARRAKIS_V2_ADDRESS, ARRAKIS_V2_RESOLVER_ADDRESS, WEWE_ADDRESS, USDC_ADDRESS, 3000);

		return { migration, arrakisV2Mock, resolverV2Mock, owner, otherAccount, accountWithFees };
	}
	describe("Configuration", function () {
		it("Should deploy the contract with correct addresses", async function () {
			const { migration, arrakisV2Mock,resolverV2Mock } = await loadFixture(deployFixture);
			expect(await migration.nfpm()).to.equal(UNI_V3_POS);
			expect(await migration.swapRouter()).to.equal(SWAP_ROUTER_ADDRESS);
			expect(await migration.tokenToMigrate()).to.equal(WEWE_ADDRESS);
			expect([ARRAKIS_V2_ADDRESS, await arrakisV2Mock.getAddress()]).to.include(await migration.arrakisV2());
			expect([ARRAKIS_V2_RESOLVER_ADDRESS, await resolverV2Mock.getAddress()]).to.include(await migration.resolverV2());
			expect(await migration.usdc()).to.equal(USDC_ADDRESS);
		});
		it("Should revert if deployed with a zero address", async function () {
			const Migration = await ethers.getContractFactory("Migration");
			await expect(Migration.deploy(ethers.ZeroAddress, SWAP_ROUTER_ADDRESS, ARRAKIS_V2_ADDRESS, ARRAKIS_V2_RESOLVER_ADDRESS, WEWE_ADDRESS, USDC_ADDRESS, 3000)).to.be.revertedWith(
				"INPM",
			);
			await expect(Migration.deploy(UNI_V3_POS, ethers.ZeroAddress, ARRAKIS_V2_ADDRESS, ARRAKIS_V2_RESOLVER_ADDRESS, WEWE_ADDRESS, USDC_ADDRESS, 3000)).to.be.revertedWith(
				"ISR",
			);
			await expect(Migration.deploy(UNI_V3_POS, SWAP_ROUTER_ADDRESS, ethers.ZeroAddress, ARRAKIS_V2_RESOLVER_ADDRESS, WEWE_ADDRESS, USDC_ADDRESS, 3000)).to.be.revertedWith(
				"IA",
			);
			await expect(Migration.deploy(UNI_V3_POS, SWAP_ROUTER_ADDRESS, ARRAKIS_V2_ADDRESS, ethers.ZeroAddress, WEWE_ADDRESS, USDC_ADDRESS, 3000)).to.be.revertedWith(
				"IAR",
			);
			await expect(Migration.deploy(UNI_V3_POS, SWAP_ROUTER_ADDRESS, ARRAKIS_V2_ADDRESS, ARRAKIS_V2_RESOLVER_ADDRESS, ethers.ZeroAddress, USDC_ADDRESS, 3000)).to.be.revertedWith(
				"ITM",
			);
			await expect(Migration.deploy(UNI_V3_POS, SWAP_ROUTER_ADDRESS, ARRAKIS_V2_ADDRESS, ARRAKIS_V2_RESOLVER_ADDRESS, WEWE_ADDRESS, ethers.ZeroAddress, 3000)).to.be.revertedWith(
				"IUSDC",
			);
		});
		it("Should be in a deterministic state of the blockchain", async function () {
			const latest = await ethers.provider.getBlock("latest");
			expect(Number(latest?.number)).is.greaterThanOrEqual(Number(DETERMINISTIC_MIN_HEIGHT));
		});
	});
	describe("On receive", function () {
		it("Should revert on receiving ERC721 from an incorrect pair", async function () {
			const { migration, owner } = await loadFixture(deployFixture);
			await mintNewPosition(owner.address, "0x532f27101965dd16442E59d40670FaF5eBB142E4");
			const positions = await listPositions(owner.address);
			const positionsContract = new ethers.Contract(UNI_V3_POS, INonfungiblePositionManager, owner);
			const tokenId = positions[0].id; // Assume this is an invalid liquidity position for the WEWE-WETH pair
			// Attempt to transfer the NFT to the migration contract and expect it to revert with the specified message
			await expect(positionsContract.safeTransferFrom(owner.address, await migration.getAddress(), tokenId)).to.be.revertedWith(
				"INFT",
			);
		});
		it("Should accept ERC721 for WEWE/WETH pair", async function () {
			const { migration, otherAccount } = await loadFixture(deployFixture);
			await mintNewPosition(otherAccount.address);
			const positions = await listPositions(otherAccount.address);
			const tokenId = positions[0].id;

			const positionsContract = new ethers.Contract(UNI_V3_POS, INonfungiblePositionManager, otherAccount);

			// Get contract balance of NFTs before the transfer
			const contractBalanceBefore = await positionsContract.balanceOf(await migration.getAddress());

			// await migration.read(BigInt("34999999999999999998335"), BigInt("2889688"), "0x33443b4942581d0aa6f0e1076eaa18ed72c07a2d");
			
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
		it("Should handle entire flow: receiving NFT, decreasing liquidity, collecting fees, swapping and receiving LP", async function () {
			const { migration, owner, otherAccount, arrakisV2Mock } = await loadFixture(deployFixture);

			await mintNewPosition(otherAccount.address);
			const positions = await listPositions(otherAccount.address);
			const tokenId = positions[0].id;
			expect(tokenId).to.not.be.undefined;

			const positionsContract = new ethers.Contract(UNI_V3_POS, INonfungiblePositionManager, otherAccount);

			// Get contract balance of NFTs before the transfer
			const contractBalanceBefore = await positionsContract.balanceOf(await migration.getAddress());

			// Assuming migration contract holds the tokens, check balance of tokens inside the contract
			const token0 = await migration.tokenToMigrate();
			const token0Contract = new ethers.Contract(token0, ["function balanceOf(address) view returns (uint256)"], ethers.provider);
			const usdcContract = new ethers.Contract(USDC_ADDRESS, ["function balanceOf(address) view returns (uint256)"], ethers.provider);

			expect(await token0Contract.balanceOf(migration.getAddress())).to.equal(0)
			expect(await usdcContract.balanceOf(migration.getAddress())).to.equal(0)

			// Transfer the NFT to the migration contract
			const tx = await positionsContract.safeTransferFrom(otherAccount, await migration.getAddress(), tokenId);
			await tx.wait();

			// Verify the contract now holds the NFT
			const contractBalanceAfter = await positionsContract.balanceOf(await migration.getAddress());
			expect(contractBalanceAfter).is.greaterThan(contractBalanceBefore);

			// Verify that the position's liquidity has been reduced to zero
			const lpPosition = await positionsContract.positions(tokenId);
			expect(lpPosition.liquidity).to.equal(0);

			// Verify LP balance
			const mockToken = await ethers.getContractAt("MockToken", await arrakisV2Mock.token());
			const balance = await mockToken.balanceOf(otherAccount.address);
    		expect(balance).to.equal(10);

			// Verify leftovers
			expect(await token0Contract.balanceOf(migration.getAddress())).to.equal(0)
			expect(await usdcContract.balanceOf(migration.getAddress())).to.equal(0)
		});
	});
});
