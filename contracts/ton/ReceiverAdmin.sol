// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;
pragma abicoder v2;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "../multisign/MultiSignOwnable.sol";
import "./IReceiverAdmin.sol";

contract ReceiverAdmin is MultiSignOwnable, IReceiverAdmin {
    using EnumerableSet for EnumerableSet.AddressSet;
    EnumerableSet.AddressSet internal _receivers;

    event ReceiverAdded(address receiver);
    event ReceiverRemoved(address receiver);

    error ReceiverIndexOutOfRange();
    error ReceiverNotFound();
    error ReceiverAlreadyExists();

    constructor(address multiSignAdmin) MultiSignOwnable(multiSignAdmin) {}

    function isReceiver(address addr) public view returns (bool) {
        return _receivers.contains(addr);
    }

    function getReceivers() external view returns (address[] memory) {
        return _receivers.values();
    }

    function getReceiverCount() external view returns (uint256) {
        return _receivers.length();
    }

    function getReceiverAt(uint256 index) external view returns (address) {
        if (index >= _receivers.length()) {
            revert ReceiverIndexOutOfRange();
        }
        return _receivers.at(index);
    }

    function _addReceiver(address receiver) internal {
        if (_receivers.contains(receiver)) {
            revert ReceiverAlreadyExists();
        }
        _receivers.add(receiver);
        emit ReceiverAdded(receiver);
    }

    function addReceiver(address receiver) external onlyMultiSignAuthorized {
        _addReceiver(receiver);
    }

    function addReceivers(
        address[] memory receivers
    ) external onlyMultiSignAuthorized {
        uint len = receivers.length;
        for (uint i = 0; i < len; i++) {
            _addReceiver(receivers[i]);
        }
    }

    function _removeReceiver(address receiver) internal {
        if (!_receivers.contains(receiver)) {
            revert ReceiverNotFound();
        }
        _receivers.remove(receiver);
        emit ReceiverRemoved(receiver);
    }

    function removeReceiver(address receiver) external onlyMultiSignAuthorized {
        _removeReceiver(receiver);
    }

    function removeReceivers(
        address[] memory receivers
    ) external onlyMultiSignAuthorized {
        uint len = receivers.length;
        for (uint i = 0; i < len; i++) {
            _removeReceiver(receivers[i]);
        }
    }
}
