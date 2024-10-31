# Scripts examples

## BRETT

```bash
npx hardhat simple-swap --owner 0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199 --asset 0x532f27101965dd16442E59d40670FaF5eBB142E4 --network localhost
```

```bash
npx hardhat mint-nft-position --owner 0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199 --asset 0x532f27101965dd16442E59d40670FaF5eBB142E4 --network localhost
```

```bash
npx hardhat transfer-nft --owner 0x32cf4d1df6fb7bB173183CF8b51EF9499c803634 --newowner 0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199 --tokenid 888441
```

```bash
npx hardhat list-positions --owner 0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199 --network localhost
```

## WEWE

```bash
npx hardhat simple-swap --owner 0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199 --network localhost
```

```bash
npx hardhat mint-nft-position --owner 0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199 --network localhost
```

```bash
npx hardhat list-positions --owner 0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199 --network localhost
```

# Deterministic State of the Blockchain Base

To perform the tests, the state of the blockchain needs to be deterministic. To achieve this:

- Set `FORKING_URL` variable in the `.env` file.
- In order to perform the tests correctly you may need to [impersonate the address](https://hardhat.org/hardhat-network/docs/guides/forking-other-networks#impersonating-accounts)

## Info about the state of the blockchain

- Blockchain: `Base`
- Block: `19197423`

- Address with WEWE / WETH: `0x38019bc40f504be4546f24083ccaf0c8553c408a`
- Block with the mint tx of the WEWE / WETH LP: `18720627`

- Address with WETH / USDC: `0xAd3B97c3C22B00C900fB04d47B3037E33f1d07d9`
- Block with the mint tx of the WETH / USDC LP: `19167068`

# Error codes

- INPM -> Invalid NonfungiblePositionManager address
- ISR -> Invalid SwapRouter address
- IA -> Invalid Arrakis V2 address
- IAR -> Invalid Arrakis V2 Resolver address
- ITM -> Invalid token to migrate address
- IUSDC -> Invalid USDC address
- NLP -> No liquidity in this LP
- INFT -> Invalid NFT: Does not have the correct token

## Contract addresses

| Contract                   | Address                                    | Network |
| -------------------------- | ------------------------------------------ | ------- |
| WeWe                       | 0x6b9bb36519538e0C073894E964E90172E1c0B41F | Base    |
| NonfungiblePositionManager | 0xC36442b4a4522E871399CD717aBDD847Ab11FE88 | Base    |
| SwapRouter                 | 0xE592427A0AEce92De3Edee1F18E0157C05861564 | Base    |
| ArrakisV2                  | 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984 | Base    |
| Farm                       | 0x62A97E8e1C56F3decc91B3d55ddcda466A967CB0 | Base    |
| CHAOS                      | 0x207Ce8693781ef7464Fb236Edf4d3617655675bd | Base    |
| Bro Merge                  | 0xBab6c6c42bb3B750B5bCE79C04677200644dbC2d | Base    |
| BBro Merge                 | 0x4dA1f4Fe67D117536aF7ea7641C729cd23d39fFd | Base    |
| Bro                        | 0x93750140C2EcEA27a53c6ed30380829607815A31 | Base    |
| BBro                       | 0xdE74eB14FB3f6F7236550819934065Acc9890622 | Base    |
| MergeFactory               | 0x491eF8Ee77Be595498cB2cC07145Df3e28776C23 | Base    |
| UniAdapter                 | 0xbAf371aC1d393cC6e155E1A51Ad8E9d7674151c5 | Base    |


# Setting white lits

White listed addresses can be set by creating the merkle root. The merkle root can be created by running the following command:

```bash
yarn install
node scripts/merkle-root.js address.csv
```

The `address.csv` file should have the following format:  Note, this file should be considered private and should not be shared.

```csv
address,amount
0x70997970C51812dc3A010C7d01b50e0d17dc79C8,100000000000000000000
```

The merkle root will be printed to the console, eg `0x403ff023bd4c929b68c940e8c21016d996bdd7b4ddd73cd42e82b2de3a8bcca3`. This merkle root can be used to set the white list in the contract by the owner.

```solidity
function setWhiteList(bytes32 merkleRoot) public onlyOwner {
    _merkleRoot = merkleRoot;
}
```

The front end will then need to:

1. Find the proof array for the address.  This could be fetched from the server or be client side.
2. Call the contract with the proof array and the address

```solidity
function mergeWithProof(address account, uint256 amount, bytes32[] calldata proof) public {
    // ... check if the account is in the merkle tree
}
```

## Turning off white list

The white list can be turned off by setting the merkle root to `bytes(0)`.  Then the contract will allow any address to merge, via `merge(uint256 amount)` or `mergeAll()`.

```solidity

    function merge(uint256 amount) external virtual whenNotPaused returns (uint256) {
        // ... check if the account is in the merkle tree
    }

    function mergeAll() external virtual whenNotPaused returns (uint256) {
        // ... check if the account is in the merkle tree
    }
```

## Example proofs

```json
Value: [ '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', '1000' ]
Proof: [
  '0x28dca11b2244051b40a1b04eadce9617f1274a546431424e61362b8de7dddf89'
]
Value: [ '0x1234567890123456789012345678901234567891', '500' ]
Proof: [
  '0xd575cdd1b7c6bdb5f45cf3f369c820b372528a8348abff17865199699970da6b',
  '0xef8897c94eaa91defb5bcf5eb1d3253c361a8315e842f60bb237531e4804e0f6'
]
Value: [ '0x1234567890123456789012345678901234567892', '200' ]
Proof: [
  '0x42aa8518982d354cd43d37da6736f2e914ad098f7f3ee8f1b23a878eb8317680',
  '0xef8897c94eaa91defb5bcf5eb1d3253c361a8315e842f60bb237531e4804e0f6'
]
```