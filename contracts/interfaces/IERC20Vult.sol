// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IERC20Vult is IERC20 {
    function approveAndCall(address spender, uint256 amount, bytes calldata extraData) external returns (bool);
}
