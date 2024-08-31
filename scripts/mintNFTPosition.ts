import { ethers } from "hardhat";


const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";
const WEWE_ADDRESS = "0x6b9bb36519538e0C073894E964E90172E1c0B41F";
const NonFungiblePositionManager = "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1";
const UniswapV3Factory = "0x33128a8fC17869897dcE68Ed026d694621f6FDfD";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const UniswapFactory = await ethers.getContractAt(
        "IUniswapV3Factory",
        UniswapV3Factory
    );
    
    const poolAddress = await UniswapFactory.getPool(WETH_ADDRESS, WEWE_ADDRESS, 10000);
    if (poolAddress === ethers.ZeroAddress) {
        console.error("El pool no existe. Debes crear el pool primero.");
        return;
    } else {
        console.log("Pool address:", poolAddress);
    }

    const MintNftPositionFactory = await ethers.getContractFactory("MintNftPosition");
    const mintNftPosition = await MintNftPositionFactory.deploy(WETH_ADDRESS, WEWE_ADDRESS, poolAddress, NonFungiblePositionManager);
    await mintNftPosition.waitForDeployment();

    console.log("MintNftPosition deployed to:", await mintNftPosition.getAddress());

    const amountToDeposit0 = ethers.parseEther("0.05");
    const amountToDeposit1 = ethers.parseEther("1000.0");

    const wethContract = await ethers.getContractAt("IERC20", WETH_ADDRESS);
    const weweContract = await ethers.getContractAt("IERC20", WEWE_ADDRESS);

    await wethContract.approve(await mintNftPosition.getAddress(), amountToDeposit0);
    await weweContract.approve(await mintNftPosition.getAddress(), amountToDeposit1);

    const tx = await mintNftPosition.connect(deployer).mintNewPosition(amountToDeposit0, amountToDeposit1);
    const receipt = await tx.wait();

    console.log("Position minted with transaction hash:", receipt?.hash);
    console.log("Event data: ", receipt?.logs)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });