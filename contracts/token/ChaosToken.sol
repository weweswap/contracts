// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ChaosToken is ERC20, Ownable {
    constructor() ERC20("$CHAOS", "CHAOS") {}

    function mint(uint256 amount) public onlyOwner {
        super._mint(address(this), amount);
    }
}
