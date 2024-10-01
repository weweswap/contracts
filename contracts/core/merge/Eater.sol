// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

abstract contract Eater is Ownable {
    uint256 internal _rate;
    address public constant wewe = 0x6b9bb36519538e0C073894E964E90172E1c0B41F;

    function _setRate(uint256 rate) internal {
        require(rate > 0, "Eater: Rate must be greater than 0");

        if (_rate != rate) {
            _rate = rate;
        }
    }

    function _eat(uint256 amount, address token, address from) internal {
        uint256 weweToTransfer = (amount * _rate) / 100;
        require(
            weweToTransfer <= IERC20(wewe).balanceOf(address(this)),
            "Eater: Insufficient token balance to transfer"
        );

        IERC20(token).transferFrom(from, address(this), amount);
        IERC20(wewe).transfer(from, weweToTransfer);

        emit Eaten(amount, from);
    }

    event Eaten(uint256 amount, address indexed account);
}
