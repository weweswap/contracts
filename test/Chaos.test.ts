import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { main as mintNewPosition } from "../scripts/mintNFTPosition";
import { main as listPositions } from "../scripts/listPositions";
import { main as setPoolConfiguration } from "../scripts/setPoolConfiguration";
import { main as deployTokenLiquidityManager } from "../scripts/deployTokenLiquidityManager";
import {
	DETERMINISTIC_FEE0_AMOUNT,
	DETERMINISTIC_FEE1_AMOUNT,
	DETERMINISTIC_MIN_HEIGHT,
	DETERMINISTIC_OWED_TOKEN0_AMOUNT,
	DETERMINISTIC_OWED_TOKEN1_AMOUNT,
	DETERMINISTIC_TOKENID,
	DETERMINISTIC_WEWE_WETH_WALLET,
	DETERMINSITIC_LIQUIDITY,
} from "./constants";

const INonfungiblePositionManager = require("@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json").abi;
const UNI_V3_POS = "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1";
const WEWE_ADDRESS = "0x6b9bb36519538e0C073894E964E90172E1c0B41F";
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const SWAP_ROUTER_ADDRESS = "0x2626664c2603336E57B271c5C0b26F421741e481";
const KYBERSWAP_ZAP_ROUTER_ADDRESS = '0x0e97C887b61cCd952a53578B04763E7134429e05';
const UNISWAP_V3_FACTORY_ADDRESS = '0x33128a8fC17869897dcE68Ed026d694621f6FDfD';

describe("Chaos contract", function () {
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

		const accountWithFees = await ethers.getImpersonatedSigner(DETERMINISTIC_WEWE_WETH_WALLET);
		const transaction = await owner.sendTransaction({
			to: accountWithFees.address,
			value: ethers.parseEther("1.0"),
		});
		await transaction.wait();

		const LiquidityManagerFactory = await ethers.getContractFactory('LiquidityManagerFactory')
		const liquidityManagerFactory = await LiquidityManagerFactory.deploy(
		  UNISWAP_V3_FACTORY_ADDRESS,
		  KYBERSWAP_ZAP_ROUTER_ADDRESS,
		  UNI_V3_POS,
		  USDC_ADDRESS,
		  SWAP_ROUTER_ADDRESS
		)
		const lmfAddress = await liquidityManagerFactory.getAddress()
	
		await setPoolConfiguration(lmfAddress, 0, { targetPriceDelta: 100, narrowRange: 4000, midRange: 10000, wideRange: 17000, fee: 500 })
		await setPoolConfiguration(lmfAddress, 1, { targetPriceDelta: 1000, narrowRange: 4000, midRange: 10000, wideRange: 17000, fee: 3000 })
		await setPoolConfiguration(lmfAddress, 2, { targetPriceDelta: 5000, narrowRange: 4000, midRange: 10000, wideRange: 17000, fee: 10000 })
	
		await deployTokenLiquidityManager(lmfAddress, WEWE_ADDRESS, 2)

		const Migration = await ethers.getContractFactory("Migration");

		const migration = await Migration.deploy(UNI_V3_POS, SWAP_ROUTER_ADDRESS, lmfAddress, WEWE_ADDRESS, USDC_ADDRESS, 3000);

		return { migration, owner, otherAccount, accountWithFees };
	}

	describe("Configuration", function () {
		it("Should deploy the contract with correct addresses", async function () {
			const { migration } = await loadFixture(deployFixture);
			expect(await migration.nfpm()).to.equal(UNI_V3_POS);
			expect(await migration.swapRouter()).to.equal(SWAP_ROUTER_ADDRESS);
			expect(await migration.tokenToMigrate()).to.equal(WEWE_ADDRESS);
			expect(await migration.usdc()).to.equal(USDC_ADDRESS);
		});
	});
});
