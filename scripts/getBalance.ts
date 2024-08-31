import { ethers } from "hardhat";

async function main() {
    // Dirección de la que quieres consultar el balance
    const address = "0x38019bC40f504BE4546F24083Ccaf0c8553C408A";

    // Obtén el balance de la dirección
    const balance = await ethers.provider.getBalance(address);

    // Convierte el balance de Wei a Ether y lo muestra en consola
    console.log(`Balance of ${address}: ${ethers.formatEther(balance)} ETH`);

    // Obtén el número del bloque actual
    const blockNumber = await ethers.provider.getBlockNumber();
    console.log("El bloque actual es:", blockNumber);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
