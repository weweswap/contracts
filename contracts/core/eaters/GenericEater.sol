// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "./IEater.sol";
import {Eater} from "./Eater.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract GenericEater is Eater, IEater {
    address public immutable underlying;

    constructor(address _wewe, address _underlying) {
        _rate = 1;
        wewe = _wewe;
        underlying = _underlying;
    }

    function getRate() external view returns (uint256) {
        return _rate;
    }

    function setRate(uint256 rate) external onlyOwner {
        require(_rate > 0, "Rate must be greater than 0");

        if (_rate != rate) {
            _rate = rate;
        }
    }

    function eatAll() external {
        uint256 balance = IERC20(underlying).balanceOf(msg.sender);
        require(balance > 0, "No balance to eat");

        _eat(underlying, balance, msg.sender, address(this));
    }

    function eat(uint256 amount) external {
        uint256 balance = IERC20(underlying).balanceOf(msg.sender);
        require(balance >= amount, "Insuffienct balance to eat");

        _eat(underlying, amount, msg.sender, address(this));
    }
}
