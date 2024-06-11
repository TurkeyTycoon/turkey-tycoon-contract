// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;
pragma abicoder v2;

import "./IMultiSignCall.sol";

abstract contract MultiSignOwnable {
    IMultiSignCall public owner;

    event OwnershipTransferred(address newOwner, address oldOwner);
    error OwnableInvalidOwner();

    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner();
        }
        _transferOwnership(initialOwner);
    }

    modifier onlyMultiSignAuthorized() {
        if (owner.multiSigned(msg.sender, msg.data)) {
            _;
        }
    }

    function renounceOwnership() public virtual onlyMultiSignAuthorized {
        _transferOwnership(address(0));
    }

    function transferOwnership(
        address newOwner
    ) public virtual onlyMultiSignAuthorized {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner();
        }
        _transferOwnership(newOwner);
    }

    function _transferOwnership(address newOwner) internal virtual {
        emit OwnershipTransferred(newOwner, address(owner));
        owner = IMultiSignCall(newOwner);
    }
}
