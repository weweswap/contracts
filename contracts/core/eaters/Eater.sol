// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "./IEater.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

abstract contract Eater is Ownable {
    uint256 internal _rate;
    address internal wewe;

    function _setRate(uint256 rate) internal {
        require(_rate > 0, "Eater: Rate must be greater than 0");

        if (_rate != rate) {
            _rate = rate;
        }
    }

    function _eat(uint256 amount, address underlying, address from) internal {
        uint256 weweToTransfer = (amount * _rate) / 100;
        require(weweToTransfer >= IERC20(wewe).balanceOf(address(this)), "Eater: Insufficient amount to transfer");

        IERC20(underlying).transferFrom(from, address(this), amount);
        IERC20(wewe).transfer(from, weweToTransfer);
    }

    event Eaten(uint256 amount, address indexed account);
}
