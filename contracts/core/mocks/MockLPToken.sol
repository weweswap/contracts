// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "hardhat/console.sol";

contract MockLPToken is ERC20 {
    constructor() ERC20("Mock LP Token", "MLP") {
        _mint(msg.sender, 1000000000000000000000000);
    }

    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        address owner = _msgSender();

        console.log("MockLPToken: owner=%s spender=%s amount=%s", owner, spender, amount);

        _approve(owner, spender, amount);

        uint256 allowance = allowance(owner, spender);
        console.log("MockLPToken: allowance=%s", allowance);

        return true;
    }
}
