// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ChaosToken is IERC20 {
    constructor() ERC20("ChaosToken", "CHAOS") {
        _mint(msg.sender, 100_000_000 * 10 ** decimals());
    }
}