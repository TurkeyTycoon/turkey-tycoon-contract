// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;
pragma abicoder v2;

import "./MultiSign.sol";
import "./IMultiSignCall.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

abstract contract MultiSignCall is MultiSign, IMultiSignCall {
    using EnumerableSet for EnumerableSet.AddressSet;
    EnumerableSet.AddressSet internal _callers;

    event CallerAdded(address caller);
    event CallerRemoved(address caller);

    error CallerNotInList();
    error CallerIndexOutOfRange();
    error CallerNotFound();
    error CallerAlreadyExists();

    function multiSigned(
        address msgSender,
        bytes memory msgData
    ) external returns (bool passed) {
        if (!_callers.contains(msg.sender)) {
            revert CallerNotInList();
        }
        passed = _multiSigned(msgSender, msgData);
    }

    function isCaller(address addr) public view returns (bool) {
        return _callers.contains(addr);
    }

    function getCallers() external view returns (address[] memory) {
        return _callers.values();
    }

    function getCallerCount() external view returns (uint256) {
        return _callers.length();
    }

    function getCallerAt(uint256 index) external view returns (address) {
        if (index >= _callers.length()) {
            revert CallerIndexOutOfRange();
        }
        return _callers.at(index);
    }

    function _addCaller(address caller) internal {
        if (_callers.contains(caller)) {
            revert CallerAlreadyExists();
        }
        _callers.add(caller);
        emit CallerAdded(caller);
    }

    function addCaller(address caller) external onlyMultiSigned {
        _addCaller(caller);
    }

    function addCallers(address[] memory callers) external onlyMultiSigned {
        uint len = callers.length;
        for (uint i = 0; i < len; i++) {
            _addCaller(callers[i]);
        }
    }

    function _removeCaller(address caller) internal {
        if (!_callers.contains(caller)) {
            revert CallerNotFound();
        }
        _callers.remove(caller);
        emit CallerRemoved(caller);
    }

    function removeCaller(address caller) external onlyMultiSigned {
        _removeCaller(caller);
    }

    function removeCallers(address[] memory callers) external onlyMultiSigned {
        uint len = callers.length;
        for (uint i = 0; i < len; i++) {
            _removeCaller(callers[i]);
        }
    }
}
