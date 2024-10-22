// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../../interfaces/IWeweReceiver.sol";

struct Vesting {
    uint256 amount;
    uint256 end;
}

abstract contract DynamicEater is IWeweReceiver, ReentrancyGuard, Pausable, Ownable {
    uint256 internal constant _ratePrecision = 100_000;
    address internal _token;
    address public wewe;
    uint256 internal _totalVested;
    uint256 internal _currentHeld;
    int256 public constant minRate = 50; // -50% represented as 0
    int256 public constant maxRate = 120; // 20% represented as 100,000

    uint32 public vestingDuration;
    mapping(address => Vesting) public vestings;

    function totalVested() external view returns (uint256) {
        return _totalVested;
    }

    function _getInstantaneousRate() internal view returns (uint256) {
        uint256 x1 = IERC20(wewe).balanceOf(address(this)) - _totalVested;
        return _getRate(x1, x1 + 1);
    }

    function _getCurrentRate(uint256 amount) internal view returns (uint256) {
        uint256 x1 = IERC20(wewe).balanceOf(address(this)) - _totalVested;
        return _getRate(x1, x1 + amount);
    }

    // x1 Lower bounds of the integral
    // x2 Upper bounds of the integral
    function _getRate(uint256 x1, uint256 x2) internal view returns (uint256) {
        uint256 currentWeWeHeld = IERC20(wewe).balanceOf(address(this));
        if (currentWeWeHeld == 0) {
            return 0;
        }

        // Slope
        int256 dxdy = (minRate - maxRate) / int256(currentWeWeHeld);
        int256 intercept = maxRate * 100_000;

        // Calculate area using definite integration formula
        int256 area1 = ((dxdy * int256(x2 ** 2)) / 2) * 100_000 + intercept * int256(x2);
        int256 area2 = ((dxdy * int256(x1 ** 2)) / 2) * 100_000 + intercept * int256(x1);
        int256 area = area1 - area2;

        // Adjust for the decimal factor used (divide by 100_000)
        require(area >= 0, "Area calculation resulted in a negative value");
        return uint256(area);
    }

    function _merge(uint256 amount, address token, address from) internal {
        uint256 weweToTransfer = (amount * _getCurrentRate(amount)) / _ratePrecision;
        _totalVested += weweToTransfer;

        require(
            weweToTransfer <= IERC20(wewe).balanceOf(address(this)),
            "Eater: Insufficient token balance to transfer"
        );

        // Merge tokens from sender
        IERC20(token).transferFrom(from, address(this), amount);

        // If transfer, dont vest
        if (vestingDuration != 0) {
            // Curent vested
            uint256 vestedAmount = vestings[from].amount;
            vestings[msg.sender] = Vesting({
                amount: weweToTransfer + vestedAmount,
                end: block.timestamp + vestingDuration * 1 minutes
            });
        } else {
            // Transfer Wewe tokens to sender
            IERC20(wewe).transfer(from, weweToTransfer);
        }

        emit Merged(amount, from);
    }

    function sweep() external onlyOwner {
        uint256 balance = IERC20(wewe).balanceOf(address(this));
        require(balance > 0, "Eater: No balance to sweep");
        IERC20(wewe).transfer(owner(), balance);
    }

    /// @notice Wewe token approveAndCall function
    function receiveApproval(
        address from,
        uint256 amount,
        address,
        bytes calldata
    ) external nonReentrant whenNotPaused {
        // After wewe approve and call, it will call this function
        require(_token != address(0), "Eater: Token address not set");

        // Eat the underlying token "_token" with the amount of "amount"
        _merge(amount, _token, from);
    }

    function togglePause() external onlyOwner {
        paused() ? _unpause() : _pause();
    }

    function setVestingDuration(uint32 duration) external onlyOwner {
        vestingDuration = duration;
    }

    function _deposit(uint256 amount) internal {
        IERC20(wewe).transferFrom(msg.sender, address(this), amount);
    }

    modifier whenClaimable(address account) {
        // Set to 0 to disable vesting
        if (vestingDuration == 0) {
            _;
        }

        require(vestings[account].end <= block.timestamp, "Eater: Vesting not ended");
        _;
    }

    modifier whenSolvent(uint256 amountToMerge) {
        uint256 newAmountToVest = (amountToMerge * _getCurrentRate(amountToMerge)) / _ratePrecision;
        require(
            IERC20(wewe).balanceOf(address(this)) >= _totalVested + newAmountToVest,
            "Eater: Insufficient Wewe balance"
        );
        _;
    }

    event Merged(uint256 amount, address indexed account);
    event RateChanged(uint256 newRate);
}
