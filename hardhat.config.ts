import { HardhatUserConfig, task, vars } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ignition-ethers";

import dotenv from "dotenv";

dotenv.config();

task("list-positions", "List the positions for a given owner")
	.addParam("owner", "The address of the owner")
	.setAction(async taskArgs => {
		const { main } = require("./scripts/listPositions.ts");
		await main(taskArgs.owner);
	});

task("simple-swap", "Executes a swap from WETH to WEWE")
	.addParam("owner", "The address of the owner")
	.addOptionalParam("asset", "The address of the aditional", "0x6b9bb36519538e0C073894E964E90172E1c0B41F")
	.setAction(async taskArgs => {
		const { main } = require("./scripts/getAssetFromEth.ts");
		await main(taskArgs.owner, taskArgs.asset);
	});

task("mint-nft-position", "Mints a new NFT position on Uniswap")
	.addParam("owner", "The address of the owner")
	.addOptionalParam("asset", "The address of the aditional", "0x6b9bb36519538e0C073894E964E90172E1c0B41F")
	.setAction(async taskArgs => {
		const { main } = require("./scripts/mintNftPosition.ts");
		await main(taskArgs.owner, taskArgs.asset);
	});

task("transfer-nft", "Transfers an NFT from one owner to another")
	.addParam("owner", "The address of the current owner")
	.addParam("newowner", "The address of the new owner")
	.addParam("tokenid", "The ID of the NFT to transfer")
	.setAction(async taskArgs => {
		const { owner, newowner, tokenid } = taskArgs;

		const { main } = require("./scripts/stoleNftPositionFromAddress.ts");

		await main(owner, newowner, tokenid);
	});

const PK = process.env.PK;

const config: HardhatUserConfig = {
	solidity: {
		version: "0.8.19",
		settings: {
			optimizer: {
				enabled: true,
				runs: 100,
			},
			viaIR: true,
		},
	},
	defaultNetwork: "localhost",
	etherscan: {
		apiKey: {
			base: process.env.BASESCAN_API_KEY || "",
		},
		customChains: [
			{
				network: "base",
				chainId: 8453,
				urls: {
					apiURL: "https://api.basescan.org/api",
					browserURL: "https://basescan.org",
				},
			},
		],
	},
	networks: {
		base: {
			accounts: PK ? [PK] : [],
			chainId: 8453,
			url: "https://mainnet.base.org",
		},
		hardhat: {
			forking: {
				url: process.env.FORKING_URL as string,
				// blockNumber: 19197423,
				enabled: true,
			},
			chains: {
				8453: {
					hardforkHistory: {
						london: 0,
					},
				},
			},
		},
	},
};

export default config;
