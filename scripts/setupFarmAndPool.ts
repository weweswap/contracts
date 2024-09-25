import { ethers } from "hardhat";

const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";
const WEWE_ADDRESS = "0x6b9bb36519538e0C073894E964E90172E1c0B41F";
const SwapRouterAddress = "0x2626664c2603336E57B271c5C0b26F421741e481";
const FARM_ADDRESS = "0x62A97E8e1C56F3decc91B3d55ddcda466A967CB0";
const CHAOS_ADDRESS = "0xf901F4ec62590231f374cA7C5d34BbcA49B11d6B";

const ercAbi = [
	"function balanceOf(address owner) view returns (uint256)",
	"function transfer(address to, uint amount) returns (bool)",
	"function deposit() public payable",
	"function approve(address spender, uint256 amount) returns (bool)",
];

const farmAbi = ["function add(uint256 allocPoint, IERC20 _lpToken, IRewarder _rewarder) external"];

export async function main(owner: string, asset?: string) {
	let signers = await ethers.getSigners();

	const chaos = new ethers.Contract(CHAOS_ADDRESS, ercAbi, signers[0]);

	const farm = new ethers.Contract(FARM_ADDRESS, farmAbi, signers[0]);
	const add = await farm.add();
	await add.wait();
}

if (require.main === module) {
	const owner = process.argv[2];
	const asset = process.argv[3];

	if (!owner) {
		console.error("Owner required");
		process.exit(1);
	}

	main(owner, asset).catch(error => {
		console.error(error);
		process.exitCode = 1;
	});
}
