import { expect } from "chai";
import { ethers } from "hardhat";

const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";
const DAI_ADDRESS = "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb";
const DAI_DECIMALS = 18; 
const SwapRouterAddress = "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD"; 

const ercAbi = [
  // Read-Only Functions
  "function balanceOf(address owner) view returns (uint256)",
  // Authenticated Functions
  "function transfer(address to, uint amount) returns (bool)",
  "function deposit() public payable",
  "function approve(address spender, uint256 amount) returns (bool)",
];

describe("SimpleSwap", function () {
  it("Should provide a caller with more DAI than they started with after a swap", async function () {
    
    /* Deploy the SimpleSwap contract */
    const simpleSwapFactory = await ethers.getContractFactory("SimpleSwap");
    const simpleSwap = await simpleSwapFactory.deploy(SwapRouterAddress);
    await simpleSwap.deploymentTransaction()?.wait()
    let signers = await ethers.getSigners();

    /* Connect to WETH and wrap some eth  */
    const WETH = new ethers.Contract(WETH_ADDRESS, ercAbi, signers[0]);
    const deposit = await WETH.deposit({ value: ethers.parseEther("10") });
    await deposit.wait();

    const expandedWETHBalanceBefore = await WETH.balanceOf(signers[0].address);
    const WETHBalanceBefore = Number(ethers.formatUnits(expandedWETHBalanceBefore, DAI_DECIMALS));
    
    /* Check Initial DAI Balance */ 
    const DAI = new ethers.Contract(DAI_ADDRESS, ercAbi, signers[0]);
    const expandedDAIBalanceBefore = await DAI.balanceOf(signers[0].address);
    const DAIBalanceBefore = Number(ethers.formatUnits(expandedDAIBalanceBefore, DAI_DECIMALS));

    /* Approve the swapper contract to spend WETH for me */
    await WETH.approve(await simpleSwap.getAddress(), ethers.parseEther("1"));
    
    /* Execute the swap */
    const amountIn = ethers.parseEther("0.1"); 
    const swap = await simpleSwap.swapWETHForDAI(amountIn, { gasLimit: 300000 });
    swap.wait(); 
    
    /* Check DAI end balance */
    const expandedDAIBalanceAfter = await DAI.balanceOf(signers[0].address);
    const DAIBalanceAfter = Number(ethers.formatUnits(expandedDAIBalanceAfter, DAI_DECIMALS));
    
    expect( DAIBalanceAfter )
      .is.greaterThan(DAIBalanceBefore); 
  });
});