// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./MockToken.sol";

contract MockArrakisV2 {
    IERC20 public token;
    IERC20 public token0;
    IERC20 public token1;

    constructor() {
        token = new MockToken("Mock LP Token", "MLP");
        token0 = IERC20(0x6b9bb36519538e0C073894E964E90172E1c0B41F);
        token1 = IERC20(0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913);
    }

    function mint(
        uint256 mintAmount,
        address receiver
    ) external returns (uint256 depositedAmount0, uint256 depositedAmount1) {
        // amount0Max_ changing the first digit to make it smaller
        depositedAmount0 = 24999999999999999998768;
        depositedAmount1 = 2072368;
        require(token0.transferFrom(msg.sender, address(this), depositedAmount0), "Transfer of token0 failed");
        require(token1.transferFrom(msg.sender, address(this), depositedAmount1), "Transfer of token1 failed");
        require(token.transfer(receiver, mintAmount), "Transfer failed");
        return (depositedAmount0, depositedAmount1);
    }
}
