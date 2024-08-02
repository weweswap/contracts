// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20Vult} from "../interfaces/IERC20Vult.sol";
import {IApproveAndCallReceiver} from "../interfaces/IApproveAndCallReceiver.sol";

contract Merge is Ownable, IApproveAndCallReceiver {
    using SafeERC20 for IERC20Vult;

    IERC20Vult public immutable wewe;
    IERC20Vult public immutable vult;

    bool public allowTwoWay;

    error VultToWeweNotAllwed();
    error InvalidToken();

    constructor(address _wewe, address _vult) {
        wewe = IERC20Vult(_wewe);
        vult = IERC20Vult(_vult);
    }

    function receiveApproval(address from, uint256 amount, address token, bytes calldata extraData) external {
        if (token == address(wewe)) {
            // wewe in, vult out
            wewe.safeTransferFrom(from, address(this), amount);
            vult.safeTransfer(from, quoteVult(amount));
        } else if (token == address(vult)) {
            // vult in, wewe out
            if (!allowTwoWay) {
                revert VultToWeweNotAllwed();
            }
            vult.safeTransferFrom(from, address(this), amount);
            wewe.safeTransfer(from, quoteWewe(amount));
        } else {
            revert InvalidToken();
        }
    }

    function setAllowTwoWay(bool newFlag) external onlyOwner {
        allowTwoWay = newFlag;
    }

    function quoteVult(uint256 w) public view returns (uint256 v) {
        uint256 W = wewe.balanceOf(address(this));
        uint256 V = vult.balanceOf(address(this));
        v = (w * V) / (w + W);
    }

    function quoteWewe(uint256 v) public view returns (uint256 w) {
        uint256 W = wewe.balanceOf(address(this));
        uint256 V = vult.balanceOf(address(this));
        w = (W * v) / (V - v);
    }
}
