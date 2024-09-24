// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "./IEater.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

abstract contract Eater is Ownable {
    uint256 internal _rate;

    IERC20 internal wewe;

    function _eat(address token, uint256 amount, address from, address to) internal {
        IERC20(token).transferFrom(from, to, amount);
        emit Eaten(amount, from);
    }

    event Eaten(uint256 amount, address indexed account);
}
