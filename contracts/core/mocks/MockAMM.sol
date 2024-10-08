// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../interfaces/IAMM.sol";
import "hardhat/console.sol";

contract MockUniswapV3 is IAMM {
    function buy(uint256 amount, address token, bytes calldata extraData) external pure returns (uint256) {
        console.log("MockUniswapV3.buy");
        return amount;
    }

    function sell(uint256 amount, address token, bytes calldata extraData) external pure returns (uint256) {
        console.log("MockUniswapV3.sell");
        return amount;
    }
}
