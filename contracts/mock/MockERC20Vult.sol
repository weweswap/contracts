// contracts/MockERC20Vult.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20Vult is ERC20 {
    constructor(string memory name, string memory symbol, uint8 decimals) ERC20(name, symbol) {}

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
