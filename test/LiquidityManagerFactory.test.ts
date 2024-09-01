import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { main as setPoolConfiguration } from "../scripts/setPoolConfiguration";
import { main as getPoolConfiguration } from "../scripts/getPoolConfiguration";

import { DETERMINISTIC_MIN_HEIGHT } from './constants';

const UNI_V3_POS = '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1';
const UNISWAP_V3_FACTORY_ADDRESS = '0x33128a8fC17869897dcE68Ed026d694621f6FDfD';
const WEWE_ADDRESS = "0x6b9bb36519538e0C073894E964E90172E1c0B41F";
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const KYBERSWAP_ZAP_ROUTER_ADDRESS = '0x0e97C887b61cCd952a53578B04763E7134429e05';


describe("Liquidity Manager Factory contract", function () {
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

    return { owner, otherAccount, liquidityManagerFactory };
  }
  describe("Pool Configuration", function () {
    it('Should set pool configuration', async function () {
      const { liquidityManagerFactory } = await loadFixture(deployFixture);
      const confExpected = { targetPriceDelta: 100, narrowRange: 4000, midRange: 10000, wideRange: 17000, fee: 500 }
      const LiquidityManagerFactory = await ethers.getContractAt(
        "LiquidityManagerFactory",
        await liquidityManagerFactory.getAddress()
      );
      const tx = await LiquidityManagerFactory.setPoolConfiguration(0, confExpected)
      await tx.wait()

      const confGot = await LiquidityManagerFactory.getPoolConfiguration(0)

      expect(confExpected.targetPriceDelta).to.be.equals(Number(confGot[0]))
      expect(confExpected.narrowRange).to.be.equals(Number(confGot[1]))
      expect(confExpected.midRange).to.be.equals(Number(confGot[2]))
      expect(confExpected.wideRange).to.be.equals(Number(confGot[3]))
      expect(confExpected.fee).to.be.equals(Number(confGot[4]))
    })
  })

  describe('Token Liquidity Manager', function () {
    it('Should deploy Token Liquidity Manager', async function () {
      const { liquidityManagerFactory } = await loadFixture(deployFixture);

      const lmfAddress = await liquidityManagerFactory.getAddress()

      await setPoolConfiguration(lmfAddress, 0, { targetPriceDelta: 100, narrowRange: 4000, midRange: 10000, wideRange: 17000, fee: 500 })
      await setPoolConfiguration(lmfAddress, 1, { targetPriceDelta: 1000, narrowRange: 4000, midRange: 10000, wideRange: 17000, fee: 3000 })
      await setPoolConfiguration(lmfAddress, 2, { targetPriceDelta: 5000, narrowRange: 4000, midRange: 10000, wideRange: 17000, fee: 10000 })

      const tx = await liquidityManagerFactory.deployLiquidityManager(WEWE_ADDRESS, 2)
      await tx.wait()

      const weweLiquidityManager = await liquidityManagerFactory.getLiquidityManager(WEWE_ADDRESS)
      expect(weweLiquidityManager).to.be.not.equals(ethers.ZeroAddress)
    })
  })
})