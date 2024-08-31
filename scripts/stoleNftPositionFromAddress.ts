import { ethers, network } from "hardhat";

const ercAbiErc721 = [
    "function transferFrom(address owner, address to, uint256 tokenId)",
];


async function main() {
    let signers = await ethers.getSigners();

    const ownerAddress = "0x38019bC40f504BE4546F24083Ccaf0c8553C408A";
    const nonfungiblePositionManager = "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1";
    const recipientAddress = signers[0].address;
    const tokenId = 888441; 

    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [ownerAddress],
    });

    const impersonatedSigner = await ethers.getSigner(ownerAddress);

    const nftContract = await ethers.getContractAt(ercAbiErc721, nonfungiblePositionManager, impersonatedSigner);

    const tx = await nftContract.transferFrom(ownerAddress, recipientAddress, tokenId);
    await tx.wait();

    console.log(`Transfer complete: NFT with ID ${tokenId} from ${ownerAddress} to ${recipientAddress}`);

    await network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [ownerAddress],
    });
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
