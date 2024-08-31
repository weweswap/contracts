import { ethers } from "hardhat";

const IWETH_ABI = [
    "function deposit() public payable",
    "function withdraw(uint wad) public",
    "function balanceOf(address owner) external view returns (uint256)"
];

async function main() {
    const [deployer] = await ethers.getSigners();
    const wethAddress = "0x4200000000000000000000000000000000000006";

    const weth = new ethers.Contract(wethAddress, IWETH_ABI, deployer);

    const tx = await weth.deposit({ value: ethers.parseEther("1.0") }); 
    await tx.wait();

    const balance = await weth.balanceOf(deployer.address);
    console.log(`WETH balance of deployer: ${ethers.formatEther(balance)}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
