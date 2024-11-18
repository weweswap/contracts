// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

interface IFactory {
    function vaults(uint256 startIndex_, uint256 endIndex_) external view returns (address[] memory);
    function numVaults() external view returns (uint256);
}

interface IArrakisV2 {
    function token0() external view returns (address);
    function token1() external view returns (address);
}

struct IVault {
    address token0;
    address token1;
    string name0;
    string name1;
    string symbol0;
    string symbol1;
    uint8 decimals0;
    uint8 decimals1;
}

contract Wrapper {
    IFactory public immutable factory;

    constructor(address _factory) {
        factory = IFactory(_factory);
    }

    function getVaults(uint256 startIndex, uint256 endIndex) external view returns (IVault[] memory) {
        address[] memory vaults = factory.vaults(startIndex, endIndex);
        IVault[] memory result = new IVault[](vaults.length);

        for (uint256 i = 0; i < vaults.length; i++) {

            IArrakisV2 _vault = IArrakisV2(vaults[i]);

            IERC20Metadata token0 = IERC20Metadata(_vault.token0());
            IERC20Metadata token1 = IERC20Metadata(_vault.token1());
            
            IVault memory vault = IVault({
                token0: _vault.token0(),
                token1: _vault.token1(),
                name0: token0.name(),
                name1: token1.name(),
                symbol0: token0.symbol(),
                symbol1: token1.symbol(),
                decimals0: token0.decimals(),
                decimals1: token1.decimals()
            });

            result[i] = vault;
        }

        return result;
    }

    function getNumVaults() external view returns (uint256) {
        return factory.numVaults();
    }
}