// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "./IEater.sol";
import "../../interfaces/IWeweReceiver.sol";
import {Eater} from "./Eater.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract GenericEater is Eater, IWeweReceiver, IEater {
    address public immutable underlying;

    constructor(address _wewe, address _underlying) {
        _rate = 100;
        wewe = _wewe;
        underlying = _underlying;
    }

    function getRate() external view returns (uint256) {
        return _rate;
    }

    function setRate(uint256 rate) external onlyOwner {
        _setRate(rate);
    }

    function eatAll() external {
        uint256 balance = IERC20(underlying).balanceOf(msg.sender);
        _eat(balance, underlying, msg.sender);
    }

    function eat(uint256 amount) external {
        uint256 balance = IERC20(underlying).balanceOf(msg.sender);
        require(balance >= amount, "GenericEater: Insufficient balance to eat");

        _eat(amount, underlying, msg.sender);
    }

    function receiveApproval(address from, uint256 amount, address token, bytes calldata) external {
        require(msg.sender == wewe, "GenericEater: Invalid sender");
        require(token == wewe, "GenericEater: Invalid token");

        _eat(amount, underlying, from);
    }
}
