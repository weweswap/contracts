// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../interfaces/IAMM.sol";
import "hardhat/console.sol";

contract MockAmm2 {
    uint256 _ratio;
    bool _doTransfer;
    address _underlyingToken;

    constructor(uint256 ratio, address underlyingToken, bool doTransfer) {
        console.log("MockAmm deployed");
        _ratio = ratio;
        _doTransfer = doTransfer;
        _underlyingToken = underlyingToken;
    }

    function setRatio(uint256 ratio) external {
        _ratio = ratio;
    }

    function addLiquidity(uint256 amount, address token) external {
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        IERC20(_underlyingToken).transferFrom(msg.sender, address(this), amount);
    }

    function buy(
        uint256 amount,
        address token,
        address recipient,
        bytes calldata extraData
    ) external returns (uint256) {
        uint256 amountOut = amount * _ratio;

        if (_doTransfer) {
            IERC20(token).transferFrom(recipient, address(this), amount);
            IERC20(_underlyingToken).transfer(recipient, amountOut);
        }

        return amountOut;
    }

    function sell(
        uint256 amount,
        address token,
        address recipient,
        bytes calldata extraData
    ) external returns (uint256) {
        uint256 amountOut = amount * _ratio;

        if (_doTransfer) {
            IERC20(token).transferFrom(recipient, address(this), amount);
            IERC20(_underlyingToken).transfer(recipient, amountOut);
        }

        return amountOut;
    }

    function sellAndBuy(
        uint256 amount,
        address token,
        address recipient,
        bytes calldata extraData
    ) external returns (uint256) {
        uint256 amountOut = amount * _ratio;
        if (_doTransfer) {
            IERC20(token).transferFrom(recipient, address(this), amount);
            IERC20(_underlyingToken).transfer(recipient, amountOut);
        }
        return amountOut;
    }
}
