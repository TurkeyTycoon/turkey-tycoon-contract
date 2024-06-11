// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;
pragma abicoder v2;

import "./IReferral.sol";
import "../multisign/MultiSignOwnable.sol";

contract Referral is IReferral, MultiSignOwnable {
    address internal _root;

    uint64 public rootStartBlockNumber = 0;
    uint64 public rootDeadlineBlockNumber;

    uint32 public maxRootUserCount = 100;
    uint32 public rootUserCount = 0;

    struct Account {
        uint64 level1Count;
        uint64 level2Count;
        address[] children;
    }

    struct AccountInfo {
        address account;
        address referrer;
        uint64 level1Count;
        uint64 level2Count;
        uint64 endBlock;
        uint64 endTimestamp;
        uint childrenOffset;
        address[] children;
    }

    mapping(address => Account) internal _accounts;

    mapping(address => address) public referrals;
    event ActivateReferral(address indexed referree, address indexed referrer);

    error AlreadyActivated();
    error ReferSelf();
    error CircularRefer();

    error InvalidReferrer();

    constructor(address multiSignAdmin) MultiSignOwnable(multiSignAdmin) {
        _root = address(this);
    }

    function isValidReferrer(address referrer) public view returns (bool) {
        if (referrals[referrer] != address(0)) {
            return true;
        }
        if (
            referrer == _root &&
            block.number >= rootStartBlockNumber &&
            block.number < rootDeadlineBlockNumber &&
            rootUserCount < maxRootUserCount
        ) {
            return true;
        }
        return false;
    }

    function activeReferral(address referrer) external {
        if (msg.sender == referrer) {
            revert ReferSelf();
        }

        if (referrals[msg.sender] != address(0)) {
            revert AlreadyActivated();
        }

        if (!isValidReferrer(referrer)) {
            revert InvalidReferrer();
        }

        if (referrer == _root) {
            rootUserCount += 1;
        }

        _accounts[referrer].level1Count += 1;
        _accounts[referrer].children.push(msg.sender);

        address parent = referrals[referrer];
        if (parent != address(0)) {
            _accounts[parent].level2Count += 1;
        }

        uint i = 0;
        while (parent != address(0) && i < 100) {
            if (parent == msg.sender) {
                revert CircularRefer();
            }
            parent = referrals[parent];
            i += 1;
        }

        referrals[msg.sender] = referrer;
        emit ActivateReferral(msg.sender, referrer);
    }

    function getAccountInfo(
        address account,
        uint64 childrenOffset,
        uint64 childrenSize
    ) external view returns (AccountInfo memory info) {
        info.account = account;
        info.referrer = referrals[account];
        Account storage a = _accounts[account];
        info.level1Count = a.level1Count;
        info.level2Count = a.level2Count;
        info.endBlock = uint64(block.number);
        info.endTimestamp = uint64(block.timestamp);
        info.childrenOffset = childrenOffset;

        uint total = a.children.length;
        if (total > childrenOffset) {
            uint len = childrenOffset + childrenSize <= total
                ? childrenSize
                : total - childrenOffset;
            info.children = new address[](len);
            for (uint i = 0; i < len; i++) {
                info.children[i] = a.children[childrenOffset + i];
            }
        }
    }

    function setRootDeadlineBlockNumber(
        uint64 newRootDeadlineBlockNumber
    ) external onlyMultiSignAuthorized {
        rootDeadlineBlockNumber = newRootDeadlineBlockNumber;
    }

    function setRootStartBlockNumber(
        uint64 newRootStartBlockNumber
    ) external onlyMultiSignAuthorized {
        rootStartBlockNumber = newRootStartBlockNumber;
    }

    function setMaxRootUserCount(
        uint32 newMaxRootUserCount
    ) external onlyMultiSignAuthorized {
        maxRootUserCount = newMaxRootUserCount;
    }
}
