import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.19",
  networks: {
    hardhat: {
      chains: { // Fix local hardfork from BASE mainnet
        8453: {
          hardforkHistory: {
            london: 0
          }
        }
      }
    }
  }
};

export default config;
