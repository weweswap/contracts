import { ethers, network } from "hardhat";

const ercAbiErc721 = [
    "function transferFrom(address owner, address to, uint256 tokenId)",
];


export async function main(currentOwner: string, newOwner: string, tokenId: number) {
    const nonfungiblePositionManager = "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1";

    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [currentOwner],
    });

    const impersonatedSigner = await ethers.getSigner(currentOwner);

    const nftContract = await ethers.getContractAt(ercAbiErc721, nonfungiblePositionManager, impersonatedSigner);

    const tx = await nftContract.transferFrom(currentOwner, newOwner, tokenId);
    await tx.wait();
    console.log(`Transfer complete: NFT with ID ${tokenId} from ${currentOwner} to ${newOwner}`);

    await network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [currentOwner],
    });
}

if (require.main === module) {
    const currentOwner = process.argv[2];
    const newOwner = process.argv[3];
    const tokenId = process.argv[4];
  
    if (!currentOwner) {
        console.error("currentOwner required");
        process.exit(1);
    }

    if (!newOwner) {
        console.error("newOwner required");
        process.exit(1);
    }

    if (!tokenId) {
        console.error("tokenId required");
        process.exit(1);
    }
  
    main(currentOwner, newOwner, Number(tokenId))
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
}


