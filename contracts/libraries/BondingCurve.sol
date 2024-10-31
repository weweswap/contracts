// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

library BondingCurve {
    // Function to simulate adding 1 more token and get the new price
    function calculateTokensOut(uint256 x, uint256 X, uint256 Y) public pure returns (uint256) {
        // Update the virtual balance for Token
        // (x+X) where x is the additional token and X is the current token balance
        uint256 newTokenBalance = X + x;
        require(newTokenBalance > 0, "calculateTokensOut: newTokenBalance must be greater than zero");

        // y = (x*Y) / (x+X)
        uint256 y = (x * Y) / newTokenBalance;
        return y;
    }
}
