import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();

    // Dirección del contrato ERC-20
    const tokenAddress = '0x4200000000000000000000000000000000000006';

    // ABI mínimo necesario para interactuar con el balanceOf
    const abi = [
        "function balanceOf(address owner) view returns (uint256)"
    ];

    // Conexión con el contrato
    const tokenContract = new ethers.Contract(tokenAddress, abi, deployer);

    // Dirección para la cual queremos consultar el balance
    const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

    // Obtener el balance
    const balance = await tokenContract.balanceOf(address);

    console.log(`El balance de ${address} es: ${ethers.formatUnits(balance, 18)} tokens`);
}

// Ejecuta el script
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
