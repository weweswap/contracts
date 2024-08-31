
// TODO: Finish this function OR just put this into the tests.

import { ethers } from "hardhat";

const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";
const WEWE_ADDRESS = "0x6b9bb36519538e0C073894E964E90172E1c0B41F";
const NonFungiblePositionManager = "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1";
const UniswapV3Factory = "0x33128a8fC17869897dcE68Ed026d694621f6FDfD";

interface NftPositionParams {
    amountToDeposit0: string; // wei
    amountToDeposit1: string; // wei
}

export async function mintNftLiquidityPosition(nftPosition: NftPositionParams) {
    const { amountToDeposit0, amountToDeposit1 } = nftPosition
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

    const wethContract = await ethers.getContractAt("IERC20", WETH_ADDRESS);
    const weweContract = await ethers.getContractAt("IERC20", WEWE_ADDRESS);

    await wethContract.approve(await mintNftPosition.getAddress(), amountToDeposit0);
    await weweContract.approve(await mintNftPosition.getAddress(), amountToDeposit1);

    // const { tokenId } = await mintNftPosition.mintNewPosition(amountToDeposit0, amountToDeposit1);
    // const receipt = await tx.wait();

    // return tokenId
}