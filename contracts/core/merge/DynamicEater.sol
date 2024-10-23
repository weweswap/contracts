// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../../interfaces/IWeweReceiver.sol";
import "../../interfaces/IAMM.sol";

struct Vesting {
    uint256 amount;
    uint256 end;
}

contract DynamicEater is IWeweReceiver, ReentrancyGuard, Pausable, Ownable {
    int256 internal constant RATE_PRECISION = 100_000;
    address internal _token;
    address public wewe;
    address public treasury;

    uint256 internal _totalVested;
    uint256 internal _currentHeld;
    uint256 public maxSupply; // Max supply of tokens to eat

    int256 public constant maxRate = 12 * 10 ** 4; // 120% or 1.2
    int256 public constant minRate = 5 * 10 ** 4; // 50% or 0.5
    uint32 public vestingDuration;
    uint256 public ratio = 131; // scaled from 1.31

    mapping(address => Vesting) public vestings;

    function canClaim(address account) external view returns (bool) {
        return vestings[account].end <= block.timestamp;
    }

    function balanceOf(address account) external view returns (uint256) {
        return vestings[account].amount;
    }

    function getToken() external view returns (address) {
        return _token;
    }

    function getRate() external view returns (uint256) {
        return _getInstantaneousRate();
    }

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }

    function totalVested() external view returns (uint256) {
        return _totalVested;
    }

    constructor(address _wewe, address _vult, uint32 _vestingDuration, uint256 _maxSupply) {
        wewe = _wewe;
        _token = _vult;
        vestingDuration = _vestingDuration;
        maxSupply = _maxSupply;
    }

    function setMaxSupply(uint256 _maxSupply) external onlyOwner {
        maxSupply = _maxSupply;
    }

    function slope() public view returns (int256) {
        int256 delta_x = int256(maxSupply) / 10 ** 18; // Scaling factor to 1
        int256 _slope = (maxRate - minRate) / delta_x; // Calculating slope from max and min values
        return _slope * 10 ** 4; // Scaling factor to 1_000
    }

    // Calculate the instantaneous rate
    function _getInstantaneousRate() internal view returns (uint256) {
        uint256 x1 = _totalVested;
        return _getRate(x1, x1 + 1);
    }

    // Calculate the amount of Wewe to transfer based on the current rate
    function _getCurrentRate(uint256 amount) internal view returns (uint256) {
        uint256 x1 = _totalVested;
        return _getRate(x1, x1 + amount);
    }

    function getScalar(uint256 mergeAmount) public pure returns (uint256) {
        uint256 SCALE_FACTOR = 100;
        mergeAmount = mergeAmount * SCALE_FACTOR;
        uint256 intercept = 120 * SCALE_FACTOR;
        uint256 y_percents = intercept - mergeAmount / 8571;
        return y_percents;
    }

    // Function to calculate rewards based on spending amount using a linear decay model
    function getTotalWeWe(uint256 mergeAmount) public view returns (uint256) {
        uint256 SCALE_FACTOR = 100;
        uint256 scalar = getScalar(mergeAmount);
        uint256 reward = (mergeAmount * ratio * scalar) / SCALE_FACTOR;

        return reward / (SCALE_FACTOR * SCALE_FACTOR);
    }

    // x1 Lower bounds of the integral
    // x2 Upper bounds of the integral
    function _getRate(uint256 x1, uint256 x2) internal view returns (uint256) {
        if (maxSupply == 0) {
            return 0;
        }

        // Slope is a constant, from max rate at 0 tokens, to min rate at max supply
        int256 dxdy = (minRate - maxRate) / int256(maxSupply);
        int256 intercept = maxRate * RATE_PRECISION;

        // Calculate area using definite integration formula (y = mx + c) multiplied by 100_000 to keep precision
        int256 area1 = ((dxdy * int256(x2 ** 2)) / 2) * RATE_PRECISION + intercept * int256(x2);
        int256 area2 = ((dxdy * int256(x1 ** 2)) / 2) * RATE_PRECISION + intercept * int256(x1);
        int256 area = area1 - area2;

        // Adjust for the decimal factor used (divide by 100_000)
        require(area >= 0, "Area calculation resulted in a negative value");
        return uint256(area);
    }

    function _merge(uint256 amount, address token, address from) internal {
        uint256 weweToTransfer = getTotalWeWe(_totalVested + amount);

        require(
            weweToTransfer <= IERC20(wewe).balanceOf(address(this)),
            "DynamicEater: Insufficient token balance to transfer"
        );

        // Merge tokens from sender
        IERC20(token).transferFrom(from, address(this), amount);

        // If transfer, dont vest
        if (vestingDuration != 0) {
            // Curent vested
            uint256 vestedAmount = vestings[from].amount;
            vestings[from] = Vesting({
                amount: weweToTransfer + vestedAmount,
                end: block.timestamp + vestingDuration * 1 minutes
            });

            _totalVested += weweToTransfer;
        } else {
            // Transfer Wewe tokens to sender
            IERC20(wewe).transfer(from, weweToTransfer);
        }

        emit Merged(amount, from);
    }

    function mergeAndSell(uint256 amount, IAMM amm, bytes calldata extraData) external nonReentrant whenNotPaused {
        uint256 balance = IERC20(_token).balanceOf(msg.sender);
        require(balance >= amount, "DynamicEater: Insufficient balance to eat");

        _merge(amount, _token, msg.sender);

        // Approve the AMM to use the tokens now in this contract
        IERC20(_token).approve(address(amm), amount);

        // Sell the tokens, can fund the contract with the token
        address recipient = treasury == address(0) ? address(this) : treasury;
        amm.sell(amount, _token, recipient, extraData);
    }

    function merge(uint256 amount) external virtual whenNotPaused {
        uint256 balance = IERC20(_token).balanceOf(msg.sender);
        require(balance >= amount, "DynamicEater: Insufficient balance to eat");

        _merge(amount, _token, msg.sender);
    }

    function claim() external whenNotPaused whenClaimable(msg.sender) {
        uint256 amount = vestings[msg.sender].amount;
        vestings[msg.sender].amount = 0;

        IERC20(wewe).transfer(msg.sender, amount);
    }

    // @notice Fund this contract with wewe token
    function deposit(uint256 amount) external onlyOwner {
        _deposit(amount);
    }

    function depositRequired() external onlyOwner {
        uint256 amount = _getCurrentRate(maxSupply - _totalVested);
        _deposit(amount);
    }

    function sweep() external onlyOwner {
        uint256 balance = IERC20(wewe).balanceOf(address(this));
        require(balance > 0, "DynamicEater: No balance to sweep");
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
        require(_token != address(0), "DynamicEater: Token address not set");

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

        require(vestings[account].end <= block.timestamp, "DynamicEater: Vesting not ended");
        _;
    }

    modifier whenSolvent(uint256 amountToMerge) {
        uint256 newAmountToVest = (amountToMerge * _getCurrentRate(amountToMerge)) / 100_000;
        require(
            IERC20(wewe).balanceOf(address(this)) >= _totalVested + newAmountToVest,
            "DynamicEater: Insufficient Wewe balance"
        );
        _;
    }

    event Merged(uint256 amount, address indexed account);
    event RateChanged(uint256 newRate);
}
