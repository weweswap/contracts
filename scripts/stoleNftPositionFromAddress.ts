import { ethers, network } from "hardhat";

const ercAbiErc721 = [
    "function transferFrom(address owner, address to, uint256 tokenId)",
];


async function main() {
    let signers = await ethers.getSigners();

    const ownerAddress = "0x32cf4d1df6fb7bB173183CF8b51EF9499c803634";
    const nonfungiblePositionManager = "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1";
    const recipientAddress = signers[0].address;
    const tokenId = [120852, 123540, 176785, 176791, 196270, 240357, 258321, 278844]; 

    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [ownerAddress],
    });

    const impersonatedSigner = await ethers.getSigner(ownerAddress);

    const nftContract = await ethers.getContractAt(ercAbiErc721, nonfungiblePositionManager, impersonatedSigner);

    for (let index = 0; index < tokenId.length; index++) {
        const tx = await nftContract.transferFrom(ownerAddress, recipientAddress, tokenId[index]);
        await tx.wait();
        console.log(`Transfer complete: NFT with ID ${tokenId[index]} from ${ownerAddress} to ${recipientAddress}`);
    }

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
