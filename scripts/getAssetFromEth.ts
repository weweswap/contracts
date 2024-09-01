import { ethers } from "hardhat";

const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";
const WEWE_ADDRESS = "0x6b9bb36519538e0C073894E964E90172E1c0B41F";
const SwapRouterAddress = "0x2626664c2603336E57B271c5C0b26F421741e481"; 

const ercAbi = [
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint amount) returns (bool)",
    "function deposit() public payable",
    "function approve(address spender, uint256 amount) returns (bool)",
];

export async function main(owner: string, asset?: string) {
    /* Deploy the SimpleSwap contract */
    const simpleSwapFactory = await ethers.getContractFactory("SimpleSwap");
    const simpleSwap = await simpleSwapFactory.deploy(asset || WEWE_ADDRESS, SwapRouterAddress);
    await simpleSwap.deploymentTransaction();
    let signers = await ethers.getSigners();

    /* Connect to WETH and wrap some eth  */
    const WETH = new ethers.Contract(WETH_ADDRESS, ercAbi, signers[0]);
    const deposit = await WETH.deposit({ value: ethers.parseEther("2.5") });
    await deposit.wait();

    /* Approve the swapper contract to spend WETH for me */
    await WETH.approve(await simpleSwap.getAddress(), ethers.parseEther("2"));

    /* Execute the swap */
    const amountIn = ethers.parseEther("2"); 
    const swap = await simpleSwap.swapWETHForWEWE(amountIn, owner, { gasLimit: 30000000 });
    await swap.wait(); 
}

if (require.main === module) {
  const owner = process.argv[2];
  const asset = process.argv[3];

  if (!owner) {
    console.error("Owner required");
    process.exit(1);
  }

  main(owner, asset).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

