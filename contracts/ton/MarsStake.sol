// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;
pragma abicoder v2;

import "../common/IMintableERC20.sol";
import "../multisign/MultiSignOwnable.sol";
import "./IReferral.sol";

contract MarsStake is MultiSignOwnable {
    struct Record {
        uint depositedAmount;
        uint withdrawnAmount;
        uint settledPoints;
        uint64 startBlock;
    }

    struct Account {
        uint collectedPoints;
        Record r0;
        Record r1;
        Record r2;
    }

    struct AccountData {
        address owner;
        Record r0;
        Record r1;
        Record r2;
        uint r0Points;
        uint r1Points;
        uint r2Points;
        uint totalPoints;
        uint collectedPoints;
        uint availablePoints;
        uint64 endBlock;
    }

    event TokenDeposit(address indexed sender, uint amount);
    event TokenWithdrawn(address indexed sender, uint amount);
    event PointCollected(
        address indexed sender,
        address pointToken,
        uint collectedAmount
    );

    bool public needReferralActived = true;
    IReferral public referral;

    IMintableERC20 public pointToken;
    IMintableERC20 public marsToken;

    uint64 public pointPerBlock = 1E13; //0.00001
    uint32 public level1RewardRatePPB = 5 * 1E7; //5%;
    uint32 public level2RewardRatePPB = 2 * 1E7; //2%;

    uint64 public endBlockNumber = type(uint64).max;

    error WithdrawAmountExceed();
    error NeedReferralActived();
    error AvailablePointIsZero();
    error ActivityHasEnded();

    mapping(address => Account) internal _accounts;

    constructor(
        address initialMarsToken,
        address multiSignAdmin
    ) MultiSignOwnable(multiSignAdmin) {
        _setMarsToken(initialMarsToken);
    }

    function _sub(uint a, uint b) internal pure returns (uint) {
        return a > b ? a - b : 0;
    }

    function _depositFor(address account, uint amount) internal {
        uint64 blockNumber = uint64(block.number);
        if (blockNumber >= endBlockNumber) {
            revert ActivityHasEnded();
        }

        address p1 = referral.referrals(account);
        if (p1 == address(0) && needReferralActived) {
            revert NeedReferralActived();
        }

        marsToken.transferFrom(account, address(this), amount);

        Record storage r0 = _accounts[account].r0;
        r0.settledPoints +=
            (_sub(r0.depositedAmount, r0.withdrawnAmount) *
                _sub(blockNumber, r0.startBlock) *
                pointPerBlock) /
            1E18;
        r0.startBlock = blockNumber;
        r0.depositedAmount += amount;

        if (p1 != address(0)) {
            Record storage r1 = _accounts[p1].r1;
            r1.settledPoints +=
                (((_sub(r1.depositedAmount, r1.withdrawnAmount) *
                    _sub(blockNumber, r1.startBlock) *
                    pointPerBlock) / 1E18) * level1RewardRatePPB) /
                1E9;
            r1.startBlock = blockNumber;
            r1.depositedAmount += amount;

            address p2 = referral.referrals(p1);
            if (p2 != address(0)) {
                Record storage r2 = _accounts[p2].r2;
                r2.settledPoints +=
                    (((_sub(r2.depositedAmount, r2.withdrawnAmount) *
                        _sub(blockNumber, r2.startBlock) *
                        pointPerBlock) / 1E18) * level2RewardRatePPB) /
                    1E9;
                r2.startBlock = blockNumber;
                r2.depositedAmount += amount;
            }
        }
        emit TokenDeposit(account, amount);
    }

    function deposit(uint amount) external {
        _depositFor(msg.sender, amount);
    }

    function _withdrawFor(address account, uint amount) internal {
        Record storage r0 = _accounts[account].r0;
        if (r0.depositedAmount < r0.withdrawnAmount + amount) {
            revert WithdrawAmountExceed();
        }
        uint64 blockNumber = uint64(block.number);
        blockNumber = blockNumber >= endBlockNumber
            ? endBlockNumber
            : blockNumber;

        r0.settledPoints +=
            (_sub(r0.depositedAmount, r0.withdrawnAmount) *
                _sub(blockNumber, r0.startBlock) *
                pointPerBlock) /
            1E18;
        r0.startBlock = blockNumber;
        r0.withdrawnAmount += amount;

        address p1 = referral.referrals(account);
        if (p1 != address(0)) {
            Record storage r1 = _accounts[p1].r1;
            r1.settledPoints +=
                (((_sub(r1.depositedAmount, r1.withdrawnAmount) *
                    _sub(blockNumber, r1.startBlock) *
                    pointPerBlock) / 1E18) * level1RewardRatePPB) /
                1E9;
            r1.startBlock = blockNumber;
            r1.withdrawnAmount += amount;

            address p2 = referral.referrals(p1);
            if (p2 != address(0)) {
                Record storage r2 = _accounts[p2].r2;
                r2.settledPoints +=
                    (((_sub(r2.depositedAmount, r2.withdrawnAmount) *
                        _sub(blockNumber, r2.startBlock) *
                        pointPerBlock) / 1E18) * level2RewardRatePPB) /
                    1E9;
                r2.startBlock = blockNumber;
                r2.withdrawnAmount += amount;
            }
        }

        marsToken.transfer(account, amount);
        emit TokenWithdrawn(account, amount);
    }

    function withdraw(uint amount) external {
        _withdrawFor(msg.sender, amount);
    }

    function withdrawAll() external {
        _withdrawFor(
            msg.sender,
            _sub(
                _accounts[msg.sender].r0.depositedAmount,
                _accounts[msg.sender].r0.withdrawnAmount
            )
        );
    }

    function getAccountData(
        address account
    ) public view returns (AccountData memory data) {
        uint64 blockNumber = uint64(block.number);
        blockNumber = blockNumber >= endBlockNumber
            ? endBlockNumber
            : blockNumber;

        Account memory a = _accounts[account];
        data.owner = account;
        data.r0 = a.r0;
        data.r1 = a.r1;
        data.r2 = a.r2;
        data.r0Points =
            a.r0.settledPoints +
            (_sub(a.r0.depositedAmount, a.r0.withdrawnAmount) *
                _sub(blockNumber, a.r0.startBlock) *
                pointPerBlock) /
            1E18;
        data.r1Points =
            a.r1.settledPoints +
            (((_sub(a.r1.depositedAmount, a.r1.withdrawnAmount) *
                _sub(blockNumber, a.r1.startBlock) *
                pointPerBlock) / 1E18) * level1RewardRatePPB) /
            1E9;
        data.r2Points =
            a.r2.settledPoints +
            (((_sub(a.r2.depositedAmount, a.r2.withdrawnAmount) *
                _sub(blockNumber, a.r2.startBlock) *
                pointPerBlock) / 1E18) * level2RewardRatePPB) /
            1E9;
        data.totalPoints = data.r0Points + data.r1Points + data.r2Points;
        data.collectedPoints = a.collectedPoints;
        data.availablePoints = _sub(data.totalPoints, a.collectedPoints);
        data.endBlock = uint64(blockNumber);
    }

    function _collectPoints(address account) internal {
        AccountData memory d = getAccountData(account);
        if (d.availablePoints == 0) {
            revert AvailablePointIsZero();
        }
        _accounts[account].collectedPoints += d.availablePoints;
        if (address(0) != address(pointToken)) {
            pointToken.mint(account, d.availablePoints);
        }
        emit PointCollected(account, address(pointToken), d.availablePoints);
    }

    function collectPoints() external {
        _collectPoints(msg.sender);
    }

    function setPointToken(
        address newPointToken
    ) external onlyMultiSignAuthorized {
        pointToken = IMintableERC20(newPointToken);
    }

    function _setMarsToken(address newMarsToken) internal {
        marsToken = IMintableERC20(newMarsToken);
    }

    function setMarsToken(
        address newMarsToken
    ) external onlyMultiSignAuthorized {
        _setMarsToken(newMarsToken);
    }

    function setPointPerBlock(
        uint64 newPointPerBlock
    ) external onlyMultiSignAuthorized {
        pointPerBlock = newPointPerBlock;
    }

    function setReferral(address newReferral) external onlyMultiSignAuthorized {
        referral = IReferral(newReferral);
    }

    function setNeedReferralActived(
        bool needActived
    ) external onlyMultiSignAuthorized {
        needReferralActived = needActived;
    }

    function setLevel1RewardRatePPB(
        uint32 newLevel1RewordRatePPB
    ) external onlyMultiSignAuthorized {
        level1RewardRatePPB = newLevel1RewordRatePPB;
    }

    function setLevel2RewardRatePPB(
        uint32 newLevel2RewordRatePPB
    ) external onlyMultiSignAuthorized {
        level2RewardRatePPB = newLevel2RewordRatePPB;
    }

    function setEndBlockNumber(
        uint64 newEndBlockNumber
    ) external onlyMultiSignAuthorized {
        endBlockNumber = newEndBlockNumber;
    }
}
