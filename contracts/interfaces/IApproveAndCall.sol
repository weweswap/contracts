// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IApproveAndCall {
    function approveAndCall(address spender, uint256 amount, bytes calldata extraData) external returns (bool);
}
