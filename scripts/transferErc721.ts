import { ethers } from "hardhat";
import { Wallet } from "ethers";

async function main() {
	const contractAddress = "0x03a520b32c04bf3beef7beb72e919cf822ed34f1";

	const fromAddress = "0x38019bC40f504BE4546F24083Ccaf0c8553C408A";
	const toAddress = "0x8fAf6BabCc2CA3E3B17d428d6D99AE8B6ba29C0d";

	// const [_ m o] = await ethers.getSigners();

	const tokenId = 934390;

	const provider = ethers.getDefaultProvider(process.env.FORKING_URL);

	const privateKey = process.env.PK_POSITION_OWNER || "";
	const wallet = new Wallet(privateKey, provider);

	const ERC721ABI = ["function safeTransferFrom(address from, address to, uint256 tokenId) public"];

	const nftContract = new ethers.Contract(contractAddress, ERC721ABI, wallet);

	const tx = await nftContract.safeTransferFrom(fromAddress, toAddress, tokenId);

	await tx.wait();

	console.log(`Token ID ${tokenId} transfered from ${fromAddress} to ${toAddress}`);
}

// Ejecutar el script
main().catch(error => {
	console.error(error);
	process.exitCode = 1;
});
