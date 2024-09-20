// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SignedSafeMath.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "../libraries/SafeCast64.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IOwnable.sol";
import "../interfaces/IRewarder.sol";
import "../interfaces/IMigratorChef.sol";
import "../interfaces/IFarm.sol";
import "../interfaces/IWeweReceiver.sol";


contract Farm is IFarm, IWeweReceiver, Ownable {
    using SafeMath for uint256;
    using SafeCast for int64;
    using SafeCast for uint64;
    using SafeCast for uint128;
    using SafeCast for int128;
    using SafeCast64 for uint256;
    using SafeERC20 for IERC20;
    using SignedSafeMath for int256;

    // Total CHAOS allocated to the pools
    uint256 private _totalSupplyAllocated;

    // Global emmissions of CHAOS tokens to be distributed per block
    uint256 public tokensPerBlock;

    // Sum of the weights of all vaults
    uint8 private _totalWeight;

    /// @notice Address of MCV1 contract.
    // ICHAOS public immutable CHAOS;
    /// @notice Address of CHAOS contract.
    IERC20 public immutable CHAOS_TOKEN;

    // @notice The migrator contract. It has a lot of power. Can only be set through governance (owner).
    IMigratorChef public migrator;

    /// @notice Info of each MCV2 pool.
    PoolInfo[] public poolInfo;

    /// @notice Address of the LP token for each MCV2 pool.
    IERC20[] public lpToken;

    /// @notice Address of each `IRewarder` contract in MCV2.
    IRewarder[] public rewarder;

    /// @notice Info of each user that stakes LP tokens.
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;

    /// @dev Total allocation points. Must be the sum of all allocation points in all pools.
    uint256 public totalAllocPoint;

    uint256 private constant ACC_CHAOS_PRECISION = 1e12;

    address private immutable _self;

    /// @param _reward The reward token contract address.
    constructor(IERC20 _reward) {
        CHAOS_TOKEN = _reward;
        _self = address(this);
    }

    /// Allocate CHAOS to the farming contract.
    /// @param pid The pool ID to allocate the CHAOS to.
    /// @param amount Amount of CHAOS to allocate.
    function allocateTokens(uint256 pid, uint256 amount) external onlyOwner {
        require(amount <= CHAOS_TOKEN.balanceOf(_self), "Chaos: Insufficient CHAOS balance");

        _totalSupplyAllocated += amount;
        poolInfo[pid].totalSupply += amount;

        emit LogPoolAllocation(pid, amount);
    }

    function setVaultWeight(uint256 pid, uint8 weight) external onlyOwner {
        if (weight == 0) {
            _totalWeight -= poolInfo[pid].weight;
            poolInfo[pid].allocPoint = 0;
        } else {
            // Calculate the new total weight delta
            uint8 delta = weight > poolInfo[pid].weight ? weight - poolInfo[pid].weight : poolInfo[pid].weight - weight;
            _totalWeight += delta;

            poolInfo[pid].weight = weight;
        }

        emit LogSetPoolWeight(pid, weight);
    }

    function getPoolInfo(uint256 pid) public view returns (PoolInfo memory) {
        return poolInfo[pid];
    }

    function getPoolWeightAsPercentage(uint256 pid) public view returns (uint8) {
        return ((poolInfo[pid].weight * 100) / _totalWeight) * 100;
    }

    function setEmisionsPerBlock(uint256 amount) external onlyOwner {
        tokensPerBlock = amount;

        emit LogSetEmisionsPerBlock(amount);
    }

    /// @notice Returns the number of pools.
    function poolLength() public view returns (uint256 pools) {
        pools = poolInfo.length;
    }

    /// @notice Add a new LP to the pool. Can only be called by the owner.
    /// DO NOT add the same LP token more than once. Rewards will be messed up if you do.
    /// @param allocPoint AP of the new pool.
    /// @param _lpToken Address of the LP ERC-20 token.
    /// @param _rewarder Address of the rewarder delegate.
    function add(uint256 allocPoint, IERC20 _lpToken, IRewarder _rewarder) public onlyOwner {
        uint256 lastRewardBlock = block.number;

        totalAllocPoint += allocPoint;
        lpToken.push(_lpToken);
        rewarder.push(_rewarder);

        // rebalance weights
        _totalWeight += 1;

        poolInfo.push(
            PoolInfo({
                allocPoint: allocPoint.toUInt64(),
                lastRewardBlock: lastRewardBlock.toUInt64(),
                accChaosPerShare: 0,
                totalSupply: 0,
                weight: 1
            })
        );

        emit LogPoolAddition(lpToken.length.sub(1), allocPoint, _lpToken, _rewarder);
    }

    /// @notice Update the given pool's CHAOS allocation point and `IRewarder` contract. Can only be called by the owner.
    /// @param _pid The index of the pool. See `poolInfo`.
    /// @param _allocPoint New AP of the pool.
    /// @param _rewarder Address of the rewarder delegate.
    /// @param overwrite True if _rewarder should be `set`. Otherwise `_rewarder` is ignored.
    function set(uint256 _pid, uint256 _allocPoint, IRewarder _rewarder, bool overwrite) public onlyOwner {
        totalAllocPoint = totalAllocPoint.sub(poolInfo[_pid].allocPoint).add(_allocPoint);
        poolInfo[_pid].allocPoint = _allocPoint.toUInt64();

        if (overwrite) {
            rewarder[_pid] = _rewarder;
        }

        emit LogSetPool(_pid, _allocPoint, overwrite ? _rewarder : rewarder[_pid], overwrite);
    }

    /// @notice Set the `migrator` contract. Can only be called by the owner.
    /// @param _migrator The contract address to set.
    function setMigrator(IMigratorChef _migrator) public onlyOwner {
        migrator = _migrator;
    }

    /// @notice Migrate LP token to another LP contract through the `migrator` contract.
    /// @param _pid The index of the pool. See `poolInfo`.
    function migrate(uint256 _pid) public {
        require(address(migrator) != address(0), "Chaos: no migrator set");

        IERC20 _lpToken = lpToken[_pid];
        uint256 bal = _lpToken.balanceOf(_self);
        _lpToken.approve(address(migrator), bal);
        IERC20 newLpToken = migrator.migrate(_lpToken);

        require(bal == newLpToken.balanceOf(_self), "Chaos: migrated balance must match");
        lpToken[_pid] = newLpToken;
    }

    /// @notice View function to see pending CHAOS on frontend.
    /// @param _pid The index of the pool. See `poolInfo`.
    /// @param _user Address of user.
    /// @return pending CHAOS reward for a given user.
    function pendingRewards(uint256 _pid, address _user) external view returns (uint256 pending) {
        PoolInfo memory pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];

        uint256 accChaosPerShare = pool.accChaosPerShare;

        if (accChaosPerShare == 0) {
            return 0;
        }

        uint256 lpSupply = lpToken[_pid].balanceOf(_self);

        if (block.number > pool.lastRewardBlock && lpSupply != 0 && totalAllocPoint > 0) {
            // Delta blocks
            uint256 blocks = block.number.sub(pool.lastRewardBlock);

            // Calculate rewards
            uint256 rewards = blocks.mul(rewardsPerBlock(_pid)).mul(pool.allocPoint) / totalAllocPoint;
            accChaosPerShare = accChaosPerShare.add(rewards.mul(ACC_CHAOS_PRECISION) / lpSupply);
        }

        pending = uint256(int256(user.amount.mul(accChaosPerShare) / ACC_CHAOS_PRECISION).sub(user.rewardDebt));
    }

    /// @notice Update reward variables for all pools. Be careful of gas spending!
    /// @param pids Pool IDs of all to be updated. Make sure to update all active pools.
    function massUpdatePools(uint256[] calldata pids) external {
        uint256 len = pids.length;
        for (uint256 i = 0; i < len; ++i) {
            updatePool(pids[i]);
        }
    }

    /// @notice Calculates and returns the `amount` of CHAOS per block.
    function rewardsPerBlock(uint256 pid) public view returns (uint256 amount) {
        amount = (tokensPerBlock * poolInfo[pid].weight) / _totalWeight;
    }

    /// @notice Update reward variables of the given pool.
    /// @param pid The index of the pool. See `poolInfo`.
    /// @return pool Returns the pool that was updated.
    function updatePool(uint256 pid) public returns (PoolInfo memory pool) {
        pool = poolInfo[pid];

        if (block.number > pool.lastRewardBlock && totalAllocPoint > 0) {
            uint256 lpSupply = lpToken[pid].balanceOf(_self);

            if (lpSupply > 0) {
                uint256 blocks = block.number.sub(pool.lastRewardBlock);
                uint256 reward = blocks.mul(rewardsPerBlock(pid)).mul(pool.allocPoint) / totalAllocPoint;
                pool.accChaosPerShare += uint128(reward.mul(ACC_CHAOS_PRECISION) / lpSupply);
            }

            pool.lastRewardBlock = block.number.toUInt64();
            poolInfo[pid] = pool;

            emit LogUpdatePool(pid, pool.lastRewardBlock, lpSupply, pool.accChaosPerShare);
        }
    }

    /// @notice Deposit LP tokens to farm for CHAOS allocation.
    /// @param pid The index of the pool. See `poolInfo`.
    /// @param amount LP token amount to deposit.
    /// @param to The receiver of `amount` deposit benefit.
    function deposit(uint256 pid, uint256 amount, address to) external {
        PoolInfo memory pool = updatePool(pid);
        UserInfo storage user = userInfo[pid][to];

        // Effects
        user.amount += amount;
        user.rewardDebt = user.rewardDebt.add(int256(amount.mul(pool.accChaosPerShare) / ACC_CHAOS_PRECISION));

        // Interactions
        IRewarder _rewarder = rewarder[pid];
        if (address(_rewarder) != address(0)) {
            _rewarder.onChaosReward(pid, to, to, 0, user.amount);
        }

        lpToken[pid].safeTransferFrom(msg.sender, _self, amount);

        emit Deposit(msg.sender, pid, amount, to);
    }

    /// @notice Withdraw LP tokens from MCV2.
    /// @param pid The index of the pool. See `poolInfo`.
    /// @param amount LP token amount to withdraw.
    /// @param to Receiver of the LP tokens.
    function withdraw(uint256 pid, uint256 amount, address to) external {
        PoolInfo memory pool = updatePool(pid);
        UserInfo storage user = userInfo[pid][msg.sender];

        // Effects
        user.rewardDebt = user.rewardDebt.sub(int256(amount.mul(pool.accChaosPerShare) / ACC_CHAOS_PRECISION));

        if (user.amount >= amount) {
            user.amount = user.amount.sub(amount);

            // Interactions
            IRewarder _rewarder = rewarder[pid];
            if (address(_rewarder) != address(0)) {
                _rewarder.onChaosReward(pid, msg.sender, to, 0, user.amount);
            }

            lpToken[pid].safeTransfer(to, amount);

            emit Withdraw(msg.sender, pid, amount, to);
        }
    }

    /// @notice Harvest proceeds for transaction sender to `to`.
    /// @param pid The index of the pool. See `poolInfo`.
    /// @param to Receiver of CHAOS rewards.
    function harvest(uint256 pid, address to) external {
        PoolInfo memory pool = updatePool(pid);

        if (pool.accChaosPerShare == 0) {
            return;
        }

        UserInfo storage user = userInfo[pid][msg.sender];

        int256 accumulatedRewards = int256(user.amount.mul(pool.accChaosPerShare) / ACC_CHAOS_PRECISION);
        uint256 _pendingRewards = uint256(accumulatedRewards.sub(user.rewardDebt));

        // Effects
        user.rewardDebt = accumulatedRewards;

        // Interactions
        if (_pendingRewards != 0) {
            CHAOS_TOKEN.safeTransfer(to, _pendingRewards);
        }

        IRewarder _rewarder = rewarder[pid];
        if (address(_rewarder) != address(0)) {
            _rewarder.onChaosReward(pid, msg.sender, to, _pendingRewards, user.amount);
        }

        emit Harvest(msg.sender, pid, _pendingRewards);
    }

    /// @notice Withdraw LP tokens from MCV2 and harvest proceeds for transaction sender to `to`.
    /// @param pid The index of the pool. See `poolInfo`.
    /// @param amount LP token amount to withdraw.
    /// @param to Receiver of the LP tokens and CHAOS rewards.
    function withdrawAndHarvest(uint256 pid, uint256 amount, address to) external {
        PoolInfo memory pool = updatePool(pid);
        UserInfo storage user = userInfo[pid][msg.sender];
        int256 accumulatedRewards = int256(user.amount.mul(pool.accChaosPerShare) / ACC_CHAOS_PRECISION);
        uint256 _pendingRewards = uint256(accumulatedRewards.sub(user.rewardDebt));

        // Effects
        user.rewardDebt = accumulatedRewards.sub(int256(amount.mul(pool.accChaosPerShare) / ACC_CHAOS_PRECISION));
        user.amount = user.amount.sub(amount);

        // Interactions
        CHAOS_TOKEN.safeTransfer(to, _pendingRewards);

        IRewarder _rewarder = rewarder[pid];
        if (address(_rewarder) != address(0)) {
            _rewarder.onChaosReward(pid, msg.sender, to, _pendingRewards, user.amount);
        }

        lpToken[pid].safeTransfer(to, amount);

        emit Withdraw(msg.sender, pid, amount, to);
        emit Harvest(msg.sender, pid, _pendingRewards);
    }

    /// @notice Withdraw without caring about rewards. EMERGENCY ONLY.
    /// @param pid The index of the pool. See `poolInfo`.
    function emergencyWithdraw(uint256 pid) external {
        UserInfo storage user = userInfo[pid][msg.sender];

        uint256 amount = user.amount;
        user.amount = 0;
        user.rewardDebt = 0;

        IRewarder _rewarder = rewarder[pid];
        if (address(_rewarder) != address(0)) {
            _rewarder.onChaosReward(pid, msg.sender, msg.sender, 0, 0);
        }

        // Note: transfer can fail or succeed if `amount` is zero.
        lpToken[pid].safeTransfer(msg.sender, amount);
        emit EmergencyWithdraw(msg.sender, pid, amount, msg.sender);
    }

    function refundAll() external onlyOwner {
        uint256 total = CHAOS_TOKEN.balanceOf(_self);

        if (total > 0) {
            _refund(total);
        }
    }

    function refund(uint256 amount) external onlyOwner {
        _refund(amount);
    }

    function _refund(uint256 amount) private {
        require(amount <= CHAOS_TOKEN.balanceOf(_self), "Chaos: Insufficient CHAOS balance");
        address to = IOwnable(address(CHAOS_TOKEN)).owner();

        require(to != address(0), "Chaos: Invalid owner address");
        CHAOS_TOKEN.safeTransfer(to, amount);

        emit Refunded(amount);
    }

    function receiveApproval(address from, uint256 amount, address token, bytes calldata extraData) external {
        uint256 pid = abi.decode(extraData, (uint256));
        require(pid < lpToken.length, "Chaos: Invalid pool ID");
        require(token == address(lpToken[pid]), "Chaos: Invalid LP token");

        // Approve the spender to spend the tokens
        lpToken[pid].approve(from, amount);
    }

    event LogPoolAllocation(uint256 indexed pid, uint256 amount);
    event LogPoolAddition(uint256 indexed pid, uint256 allocPoint, IERC20 indexed lpToken, IRewarder indexed rewarder);
    event LogSetEmisionsPerBlock(uint256 amount);
    event LogSetPool(uint256 indexed pid, uint256 allocPoint, IRewarder indexed rewarder, bool overwrite);
    event LogUpdatePool(uint256 indexed pid, uint64 lastRewardBlock, uint256 lpSupply, uint256 accChaosPerShare);
    event LogSetPoolWeight(uint256 indexed pid, uint8 weight);
}
