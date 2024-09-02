import { ethers } from 'hardhat';

const UNI_V3_POS = '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1';
const UNI_V3_POS_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256 tokenId)',
  'function positions(uint256 tokenId) external view override returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)',
];

const ERC20_ABI = ['function symbol() external view returns (string memory)'];

type PositionNFT = {
  nonce: BigInt;
  operator: string;
  token0: string;
  token1: string;
  fee: BigInt;
  tickLower: BigInt;
  tickUpper: BigInt;
  liquidity: BigInt;
  feeGrowthInside0LastX128: BigInt;
  feeGrowthInside1LastX128: BigInt;
  tokensOwed0: BigInt;
  tokensOwed1: BigInt;
};

type PositionResume = {
  id: BigInt;
  pool: string;
  feeBps: BigInt;
  minTick: BigInt;
  maxTick: BigInt;
  liquidity: BigInt;
  feeGrowthInside0LastX128: BigInt;
  feeGrowthInside1LastX128: BigInt;
  tokensOwed0: BigInt;
  tokensOwed1: BigInt;
};

export async function main(owner: string) {
  const signers = await ethers.getSigners();

  const positionsContract = new ethers.Contract(
    UNI_V3_POS,
    UNI_V3_POS_ABI,
    signers[0],
  );
  const balance = await positionsContract.balanceOf(owner);

  const tasks = [];
  for (let i = 0; i < balance; i++) {
    tasks.push(positionsContract.tokenOfOwnerByIndex(owner, i));
  }

  const positionsID: BigInt[] = await Promise.all(tasks);

  const positions: PositionResume[] = await Promise.all(
    positionsID.map(async (position, index) => {
      const data = await positionsContract.positions(position);
      const nft: PositionNFT = {
        nonce: data[0],
        operator: data[1],
        token0: data[2],
        token1: data[3],
        fee: data[4],
        tickLower: data[5],
        tickUpper: data[6],
        liquidity: data[7],
        feeGrowthInside0LastX128: data[8],
        feeGrowthInside1LastX128: data[9],
        tokensOwed0: data[10],
        tokensOwed1: data[11],
      };

      const token0Contract = new ethers.Contract(
        nft.token0,
        ERC20_ABI,
        signers[0],
      );
      const token1Contract = new ethers.Contract(
        nft.token1,
        ERC20_ABI,
        signers[0],
      );

      return {
        id: positionsID[index],
        pool: `${await token0Contract.symbol()}/${await token1Contract.symbol()}`,
        minTick: nft.tickLower,
        maxTick: nft.tickUpper,
        feeBps: nft.fee,
        liquidity: data[7],
        feeGrowthInside0LastX128: data[8],
        feeGrowthInside1LastX128: data[9],
        tokensOwed0: nft.tokensOwed0,
        tokensOwed1: nft.tokensOwed1,
      };
    }),
  );

  console.table(positions);

  return positions;
}

if (require.main === module) {
  const owner = process.argv[2];

  if (!owner) {
    console.error('The owner parameter is mandatory');
    process.exit(1);
  }

  main(owner).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
