// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "../../interfaces/IAMM.sol";
import {GenericMerge} from "./GenericMerge.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MergeWithMarket is GenericMerge {
    constructor(address _wewe, address token) GenericMerge(_wewe, token) {}

    // function setAMM(address _amm) external onlyOwner {
    //     amm = IAMM(_amm);
    // }

    function mergeAndBuy(uint256 amount, IAMM amm, bytes calldata extraData) external {
        uint256 balance = IERC20(_token).balanceOf(msg.sender);
        require(balance >= amount, "GenericMerge: Insufficient balance to eat");

        IERC20(_token).approve(address(amm), amount);
        _merge(amount, _token, msg.sender);

        amm.buy(amount, extraData);
    }

    function mergeAndSell(uint256 amount, IAMM amm, bytes calldata extraData) external {
        uint256 balance = IERC20(_token).balanceOf(msg.sender);
        require(balance >= amount, "GenericMerge: Insufficient balance to eat");

        _merge(amount, _token, msg.sender);

        IERC20(_token).approve(address(amm), amount);
        amm.sell(amount, extraData);
    }
}
