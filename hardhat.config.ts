import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      // {
      //   version: "0.8.19",  // Versión principal para tus contratos
      //   settings: {
      //     optimizer: {
      //       enabled: true,
      //       runs: 200,
      //     },
      //   },
      // },
      {
        version: "0.7.6",  // Versión específica para contratos de Uniswap V3
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      // forking: {
      //   url: "http://localhost:8545", // URL del nodo local
      // },
      chains: {
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
