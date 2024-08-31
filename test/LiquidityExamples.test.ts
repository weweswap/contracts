import { ethers } from "hardhat";
import { expect } from "chai";
import { Signer } from "ethers";
import { IERC20 } from "../typechain-types/@openzeppelin/contracts/token/ERC20";

xdescribe("LiquidityExamples", function () {
  let liquidityExamples: any
  let wewe: IERC20
  let weth: IERC20
  let owner: Signer;
  let weweAddress: string = "0x6b9bb36519538e0C073894E964E90172E1c0B41F";
  let wethAddress: string = "0x4200000000000000000000000000000000000006";

  it("should mint a new position with WEWE and WETH", async function () {

    [owner] = await ethers.getSigners();

    console.log('Address', await owner.getAddress())

    // Deploy the LiquidityExamples contract
    const LiquidityExamplesFactory = await ethers.getContractFactory("LiquidityExamples");
    liquidityExamples = await LiquidityExamplesFactory.deploy();
    await liquidityExamples.deploymentTransaction();

    // Get references to the DAI and USDC tokens
    wewe = await ethers.getContractAt("IERC20", weweAddress);
    weth = await ethers.getContractAt("IERC20", wethAddress);

    // Define the amount of tokens to mint for liquidity
    const amountWEWE = ethers.parseUnits("1000", 18);
    const amountWETH = ethers.parseUnits("1000", 18);

    // Mint some DAI and USDC to the owner (in a real test, you would need a mock or funded tokens)
    // await dai.connect(owner).mint(await owner.getAddress(), amountDAI);
    // await usdc.connect(owner).mint(await owner.getAddress(), amountUSDC);

    // Approve the LiquidityExamples contract to spend DAI and USDC
    await wewe.connect(owner).approve(await liquidityExamples.getAddress(), amountWEWE);
    await weth.connect(owner).approve(await liquidityExamples.getAddress(), amountWETH);

    // Call mintNewPosition
    const tx = await liquidityExamples.connect(owner).mintNewPosition();
    const receipt = await tx.wait();

    // Parse logs to find the Mint event
    const event = receipt.events?.find((event: { event: string; }) => event.event === "Mint");
    const [tokenId, liquidity, amount0, amount1] = event?.args ?? [];

    // Assertions
    expect(tokenId).to.be.a("number");
    expect(liquidity).to.be.gt(0);
    expect(amount0).to.be.eq(amountWETH);
    expect(amount1).to.be.eq(amountWEWE);

    console.log(`Minted new position with Token ID: ${tokenId}, Liquidity: ${liquidity}`);
  });
});
