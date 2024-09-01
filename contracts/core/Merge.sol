// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IWeweReceiver} from "../interfaces/IWeweReceiver.sol";
import {IERC1363Spender} from "../token/ERC1363/IERC1363Spender.sol";
import {IMerge} from "../interfaces/IMerge.sol";

contract Merge is IMerge, IWeweReceiver, IERC1363Spender, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable wewe;
    IERC20 public immutable vultisig;

    uint256 public virtualWeweBalance;
    uint256 public weweBalance;
    uint256 public vaultBalance;

    LockedStatus public lockedStatus;

    address private immutable _self;

    constructor(address _wewe, address _vultisig) {
        require(_wewe != address(0), "Wewe address cannot be 0");
        require(_vultisig != address(0), "Vultisig address cannot be 0");
        wewe = IERC20(_wewe);
        vultisig = IERC20(_vultisig);
        _self = address(this);
    }

    /// @notice Wewe token approveAndCall
    function receiveApproval(
        address from,
        uint256 amount,
        address token,
        bytes calldata extraData
    ) external nonReentrant {
        if (msg.sender != address(wewe)) {
            revert InvalidTokenReceived();
        }
        if (lockedStatus == LockedStatus.Locked) {
            revert MergeLocked();
        }
        if (amount == 0) {
            revert ZeroAmount();
        }

        // wewe in, vault out
        uint256 vaultOut = quoteVault(amount);
        wewe.safeTransferFrom(from, _self, amount);
        vultisig.safeTransfer(from, vaultOut);
        weweBalance += amount;
        vaultBalance -= vaultOut;
    }

    /*
     * @inheritdoc IERC1363Spender
     * Vault token approveAndCall
     */
    function onApprovalReceived(
        address from,
        uint256 amount,
        bytes calldata data
    ) external nonReentrant returns (bytes4) {
        if (msg.sender != address(vultisig)) {
            revert InvalidTokenReceived();
        }
        if (lockedStatus != LockedStatus.TwoWay) {
            revert VaultToWeweNotAllowed();
        }
        if (amount == 0) {
            revert ZeroAmount();
        }

        // vault in, wewe out
        uint256 weweOut = quoteWewe(amount);
        vultisig.safeTransferFrom(from, _self, amount);
        wewe.safeTransfer(from, weweOut);
        vaultBalance += amount;
        weweBalance -= weweOut;

        return this.onApprovalReceived.selector;
    }

    function deposit(IERC20 token, uint256 amount) external onlyOwner {
        if (token != wewe && token != vultisig) {
            revert InvalidTokenReceived();
        }

        token.safeTransferFrom(msg.sender, address(this), amount);
        if (token == wewe) {
            weweBalance += amount;
        } else {
            // Vault
            vaultBalance += amount;
        }
    }

    function setLockedStatus(LockedStatus newStatus) external onlyOwner {
        lockedStatus = newStatus;
    }

    function setVirtualWeweBalance(uint256 newVirtualBalance) external onlyOwner {
        virtualWeweBalance = newVirtualBalance;
    }

    function quoteVault(uint256 w) public view returns (uint256 v) {
        v = (w * V()) / (w + W());
    }

    function quoteWewe(uint256 v) public view returns (uint256 w) {
        w = (v * W()) / (v + V());
    }

    /// @notice For total wewe balance, virtual balance should be added
    function W() internal view returns (uint256) {
        return weweBalance + virtualWeweBalance;
    }

    /// @notice For total vault balance accounting logic
    function V() internal view returns (uint256) {
        return vaultBalance;
    }
}
