// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../../arrakis/interfaces/IArrakisV2Resolver.sol";

contract MockResolverV2 {
    // Mock de la función getMintAmounts
    function getMintAmounts(
        IArrakisV2 vaultV2_,
        uint256 amount0Max_,
        uint256 amount1Max_
    ) external view returns (uint256 amount0, uint256 amount1, uint256 mintAmount) {
        //amount0Max_ = 34999999999999999998768
        //amount1Max_ = 3072368
        return (amount0Max_, amount1Max_, 10);
    }
}
