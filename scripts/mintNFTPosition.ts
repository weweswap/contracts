import { ethers } from "hardhat";

const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";
const WEWE_ADDRESS = "0x6b9bb36519538e0C073894E964E90172E1c0B41F";
const WEWE_DECIMALS = 18;
const NonFungiblePositionManager = "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const MintNftPositionFactory = await ethers.getContractFactory("MintNftPosition");
    const mintNftPosition = await MintNftPositionFactory.deploy(WETH_ADDRESS, WEWE_ADDRESS, NonFungiblePositionManager);
    await mintNftPosition.waitForDeployment();

    console.log("MintNftPosition deployed to:", await mintNftPosition.getAddress());

    // Definir las cantidades de LP
    const amountToDeposit0 = ethers.parseEther("0.01"); // 1 WETH
    const amountToDeposit1 = ethers.parseEther("1000.0"); // 1000 WEWE

    const wethContract = await ethers.getContractAt("IERC20", WETH_ADDRESS);
    const weweContract = await ethers.getContractAt("IERC20", WEWE_ADDRESS);

    await wethContract.approve(await mintNftPosition.getAddress(), amountToDeposit0);
    await weweContract.approve(await mintNftPosition.getAddress(), amountToDeposit1);

    const UniswapFactory = await ethers.getContractAt(
        "IUniswapV3Factory",
        "0x33128a8fC17869897dcE68Ed026d694621f6FDfD"
    );
    
    const poolAddress = await UniswapFactory.getPool(WETH_ADDRESS, WEWE_ADDRESS, 10000);
    if (poolAddress === ethers.ZeroAddress) {
        console.error("El pool no existe. Debes crear el pool primero.");
        return;
    } else {
        console.log("Pool address:", poolAddress);
    }

    // Llamar a la función mintNewPosition para crear una nueva posición de liquidez
    const tx = await mintNftPosition.mintNewPosition(amountToDeposit0, amountToDeposit1);
    const receipt = await tx.wait();

    console.log("Position minted with transaction hash:", receipt?.hash);
    console.log("Event data: ", receipt?.logs)

    // Parse logs to find the Mint event
    // const event = receipt?.logs.find((log: any) => log.fragment.name === "Mint");
    //  const [tokenId, liquidity, amount0, amount1] = event.args ?? [];

    //  console.log(`Minted new position with Token ID: ${tokenId}, Liquidity: ${liquidity}`);
    //  console.log(`Amount0: ${amount0}, Amount1: ${amount1}`);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });