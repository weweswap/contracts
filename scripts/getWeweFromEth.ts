import { ethers } from "hardhat";

const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";
const WEWE_ADDRESS = "0x6b9bb36519538e0C073894E964E90172E1c0B41F";
const WEWE_DECIMALS = 18; 
const SwapRouterAddress = "0x2626664c2603336E57B271c5C0b26F421741e481"; 

const ercAbi = [
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint amount) returns (bool)",
    "function deposit() public payable",
    "function approve(address spender, uint256 amount) returns (bool)",
];

async function main() {
    /* Deploy the SimpleSwap contract */
    const simpleSwapFactory = await ethers.getContractFactory("SimpleSwap");
    const simpleSwap = await simpleSwapFactory.deploy(SwapRouterAddress);
    await simpleSwap.deploymentTransaction();
    let signers = await ethers.getSigners();

    /* Connect to WETH and wrap some eth  */
    const WETH = new ethers.Contract(WETH_ADDRESS, ercAbi, signers[0]);
    const deposit = await WETH.deposit({ value: ethers.parseEther("1") });
    await deposit.wait();

    console.log('WETH balance', await WETH.balanceOf(signers[0].address));
    
    /* Check Initial DAI Balance */ 
    const DAI = new ethers.Contract(WEWE_ADDRESS, ercAbi, signers[0]);
    const expandedDAIBalanceBefore = await DAI.balanceOf(signers[0].address);
    const DAIBalanceBefore = Number(ethers.formatUnits(expandedDAIBalanceBefore, WEWE_DECIMALS));

    console.log('WEWE balance', await DAI.balanceOf(signers[0].address));

    /* Approve the swapper contract to spend WETH for me */
    await WETH.approve(await simpleSwap.getAddress(), ethers.parseEther("0.1"));

    console.log('apprved previous call', await simpleSwap.getAddress())
    
    /* Execute the swap */
    const amountIn = ethers.parseEther("0.1"); 
    console.log('amountIn', amountIn)
    const swap = await simpleSwap.swapWETHForWEWE(amountIn, { gasLimit: 30000000 });
    swap.wait(); 
    
    /* Check DAI end balance */
    const expandedDAIBalanceAfter = await DAI.balanceOf(signers[0].address);
    const DAIBalanceAfter = Number(ethers.formatUnits(expandedDAIBalanceAfter, WEWE_DECIMALS));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
