// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC777/ERC777.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ChaosToken is ERC777, Ownable {
    constructor(address[] memory defaultOperators) ERC777("$CHAOS", "CHAOS", defaultOperators) {
        _mint(msg.sender, 1000000000 * 10 ** 18, "", "");
    }

    function mint(uint256 amount) public onlyOwner {
        _mint(address(this), amount, "", "");
    }
}
