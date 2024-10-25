// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {BaseUniRouter} from "./BaseUniRouter.sol";
import {ISellAMM} from "../../interfaces/IAMM.sol";
import {IUniswapV3} from "../../core/adaptors/IUniswapV3.sol";
import {ISwapRouter} from "../../core/adaptors/IUniswapV3.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

contract UniswapV3ViaRouter2 is BaseUniRouter, ISellAMM {
    // Router https://docs.uniswap.org/contracts/v3/reference/deployments/base-deployments
    address private constant wrappedETH = 0x4200000000000000000000000000000000000006;
    address private constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address public immutable token;

    function name() external view returns (string memory) {
        string memory _name = IERC20Metadata(token).name();
        return string.concat(_name, ":UniswapV3ViaRouter2");
    }

    constructor(address _token) Ownable() {
        require(_token != address(0), "Invalid token address");
        token = _token;

        IERC20(_token).approve(router, type(uint256).max);
    }

    function sell(uint256 amount, address recipient) external returns (uint256) {
        uint24 feeTokenWeth = 10000;
        uint24 feeWethToUsdc = 500;
        uint24 feeUsdcToWewe = 10000;

        bytes memory path = abi.encodePacked(token, feeTokenWeth, wrappedETH, feeWethToUsdc, USDC, feeUsdcToWewe, wewe);
        uint256 amountOut = _swapMultihop(token, amount, path, msg.sender, recipient, 0);

        emit Sold(amount, amountOut, token, recipient);
        return amountOut;
    }
}
