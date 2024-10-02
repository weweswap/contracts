// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "./IEater.sol";
import "../../interfaces/IWeweReceiver.sol";
import {Eater} from "./Eater.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract BroEater is Eater, IWeweReceiver, IEater, ReentrancyGuard {
    address public constant underlying = 0x93750140C2EcEA27a53c6ed30380829607815A31;
    uint256 private _startPeriod;
    uint256 private _mergePeriod;

    constructor(address _wewe) {
        _rate = 100;
        wewe = _wewe;
    }

    function startPeriod() external view returns (bool) {
        return true;
    }

    function mergePeriod() external view returns (bool) {
        return true;
    }

    function getRate() external view returns (uint256) {
        return _rate;
    }

    function setRate(uint256 rate) external onlyOwner {
        _setRate(rate);
    }

    function setStartPeriod() external onlyOwner {
        _startPeriod = block.timestamp + 30 days;
    }

    function setMergePeriod() external onlyOwner {
        _mergePeriod = block.timestamp + 30 days;
    }

    function eatAll() external {
        uint256 balance = IERC20(underlying).balanceOf(msg.sender);
        _eat(balance, underlying, msg.sender);
    }

    function deposit(uint256 amount) external {
        uint256 balance = IERC20(underlying).balanceOf(msg.sender);
        require(balance >= amount, "BroEater: Insufficient balance to eat");

        _eat(amount, underlying, msg.sender);
    }

    function receiveApproval(address from, uint256 amount, address token, bytes calldata) external nonReentrant {
        require(msg.sender == wewe, "BroEater: Invalid sender");
        require(token == wewe, "BroEater: Invalid token");

        _eat(amount, underlying, from);
    }
}
