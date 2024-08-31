import { ethers, network } from "hardhat";

async function main() {
  const targetAddress = "0x38019bC40f504BE4546F24083Ccaf0c8553C408A"; // Reemplaza con la dirección de la cuenta que quieres modificar.
  const newBalance = ethers.parseEther("100.0"); // 100 ETH

  // Convertir a formato hexadecimal adecuado
  const balanceHex = `0x${newBalance.toString().replace(/^0x/, '')}`;

  // Configurar el saldo en la cuenta objetivo
  await network.provider.send("hardhat_setBalance", [
    targetAddress,
    balanceHex,
  ]);

  const balance = await ethers.provider.getBalance(targetAddress);
  console.log(`Nuevo saldo de la cuenta ${targetAddress}: ${ethers.formatEther(balance)} ETH`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
