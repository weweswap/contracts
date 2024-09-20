// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IApproveAndCall {
    function callDeposit(uint256 pid, uint256 amount) external returns (bool);
}
