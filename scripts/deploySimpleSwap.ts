import { ethers } from "hardhat";

async function main() {
  const simpleSwap = await ethers.deployContract("SimpleSwap", ['0x2626664c2603336E57B271c5C0b26F421741e481']);

  await simpleSwap.waitForDeployment();

  console.log(
    `Simple swap deploy: ${await simpleSwap.getAddress()}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
