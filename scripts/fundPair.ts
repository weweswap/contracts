import { ethers } from "hardhat";

async function main() {
  const tokenToFund = "0x6b9bb36519538e0C073894E964E90172E1c0B41F";
  const tokenDecimals = 18
  
  // Dirección de una cuenta con muchos DAI y USDC (ballena)
  const whaleAddress = "0x5396c2D02e28603444cD17747234285C6702Be3c"; // Reemplaza con una dirección real
  
  // Tu dirección local en el fork
  const [signer] = await ethers.getSigners();
  const recipientAddress = await signer.getAddress();

  // Impersonar la cuenta de la ballena
  await ethers.provider.send("hardhat_impersonateAccount", [whaleAddress]);
  const whaleSigner = await ethers.getSigner(whaleAddress);

  // Conectar a los contratos de tokens
  const tokenToFundContract = await ethers.getContractAt("IERC20", tokenToFund, whaleSigner);

  // Transferir fondos a tu cuenta
  // const daiAmount = ethers.parseUnits("1000", 18); // 1000 DAI
  const usdcAmount = ethers.parseUnits("10000000", tokenDecimals); // 1000 USDC

  // await daiContract.transfer(recipientAddress, daiAmount);
  await tokenToFundContract.transfer(recipientAddress, usdcAmount);

  // console.log(`Transferred ${ethers.formatUnits(daiAmount, 18)} DAI to ${recipientAddress}`);
  console.log(`Transferred ${ethers.formatUnits(usdcAmount, tokenDecimals)} to ${recipientAddress}`);

  // Dejar de impersonar la cuenta de la ballena
  await ethers.provider.send("hardhat_stopImpersonatingAccount", [whaleAddress]);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
