//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;


import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


contract SimplyStaking is AccessControl {
    
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    IERC20 public stakingToken;
    IERC20 public rewardsToken;


    uint public unstakeTime = 12 * 1 minutes; 
    uint public rewardTime = 6 * 1 minutes;
    uint public rewardRate = 10; 

    mapping(address => StakingInfo) private _balances;


    event Stake(
        address indexed stakeholder,
        uint amount);

    event Unstake(
        address indexed stakeholder,
        uint amount);

    event Claim(
        address indexed stakeholder,
        uint amount);


    struct StakingInfo {
        uint staked;
        uint lastTickDate;
        uint availableReward;
        uint unavailableReward;
    }


    modifier validAmount(
        uint _amount) {
        require(
            _amount > 0,
            "Amount value is not allowed");
        _;
    }


    constructor(
        address _staking,
        address _token)
    {
        stakingToken = IERC20(_staking);
        rewardsToken = IERC20(_token);

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
    }


    function stake(
        uint _amount)
        external
        validAmount(_amount)
    {
        
        StakingInfo storage userStake = _balances[msg.sender];

        if (isAvailable(userStake.lastTickDate, rewardTime)) {
            unchecked {
                userStake.availableReward += userStake.unavailableReward;
                userStake.unavailableReward = 0;
            }
        }

        unchecked {
            userStake.lastTickDate = block.timestamp;
            userStake.staked += _amount;
            userStake.unavailableReward += _amount * rewardRate / 100;
        }

        stakingToken.safeTransferFrom(msg.sender, address(this), _amount);
        emit Stake(msg.sender, _amount);
    }


    function unstake(
        uint amount)
        external
        validAmount(amount)
    {

        StakingInfo storage userStake = _balances[msg.sender];

        require(
            isAvailable(userStake.lastTickDate, unstakeTime),
            "Unstake is not available");

        require(
            amount <= userStake.staked,
            "Insufficient amount to unstake");

        unchecked {
            userStake.staked -= amount;
        }

        stakingToken.safeTransfer(msg.sender, amount);
        emit Unstake(msg.sender, amount);
    }


    function claim() 
        external 
    {
        StakingInfo storage userStake = _balances[msg.sender];
        uint reward = userStake.availableReward;
        userStake.availableReward = 0;

        require(
            reward > 0,
            "Not enough tokens to withdraw");

        if (isAvailable(userStake.lastTickDate, rewardTime)) {
            unchecked {
                reward += userStake.unavailableReward;
                userStake.unavailableReward = 0;
            }
        }

        rewardsToken.safeTransfer(msg.sender, reward);
        emit Claim(msg.sender, reward);
    }


    function setRewardRate(
        uint _rewardRate) 
        external 
        onlyRole(ADMIN_ROLE)
    {
        rewardRate = _rewardRate;
    }


    function setUnavailableTime(
        uint _rewardFreezePeriod) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        rewardTime = _rewardFreezePeriod;
    }


    function setUnstakeTime(
        uint _unstakeFreezePeriod)
        external 
        onlyRole(ADMIN_ROLE) 
    {
        unstakeTime = _unstakeFreezePeriod;
    }


    function isAvailable(
        uint _timestamp,
        uint _period)
        private
        view
        returns (bool) 
    {
        return (block.timestamp - _timestamp) > _period;
    }


    function balanceOfSender() 
        external 
        view
        returns (StakingInfo memory)
    {
        return _balances[msg.sender];
    }

}