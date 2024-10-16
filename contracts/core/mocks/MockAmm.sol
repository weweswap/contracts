// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../interfaces/IAMM.sol";
import "hardhat/console.sol";

contract MockAmm is IAMM {
    uint256 _ratio;

    constructor(uint256 ratio) {
        console.log("MockAmm deployed");
        _ratio = ratio;
    }

    function setRatio(uint256 ratio) external {
        _ratio = ratio;
    }

    function deposit(uint256 amount, address token) external {
        IERC20(token).transferFrom(msg.sender, address(this), amount);
    }

    function buy(
        uint256 amount,
        address token,
        address recipient,
        bytes calldata extraData
    ) external returns (uint256) {
        uint256 amountOut = amount * _ratio;
        IERC20(token).transfer(recipient, amountOut);
        return amountOut;
    }

    function sell(
        uint256 amount,
        address token,
        address recipient,
        bytes calldata extraData
    ) external returns (uint256) {
        uint256 amountOut = amount * _ratio;
        IERC20(token).transfer(recipient, amountOut);
        return amountOut;
    }

    function sellAndBuy(
        uint256 amount,
        address token,
        address recipient,
        bytes calldata extraData
    ) external returns (uint256) {
        uint256 amountOut = amount * _ratio;
        IERC20(token).transfer(recipient, amountOut);
        return amountOut;
    }
}
