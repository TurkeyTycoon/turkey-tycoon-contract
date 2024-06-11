// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;
pragma abicoder v2;

import "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";

abstract contract MultiSign {
    using EnumerableMap for EnumerableMap.AddressToUintMap;
    EnumerableMap.AddressToUintMap internal _signers;

    // default ratio is 2/3 ;
    uint8 public molecular = 2;
    uint8 public denominator = 3;

    // default sign timeout 10 minutes;
    uint32 public signTimeout = 10 * 60;
    uint64 public lastSignTimestamp;

    event MultiSigned(
        address indexed msgSender,
        bool passed,
        bytes4 msgSig,
        uint16 signedCount,
        uint operationHash
    );

    event SignerAdded(address indexed signer);
    event SignerRemoved(address indexed signer);
    event SignTimeoutChanged(uint32 newSignTimeout, uint32 oldSignTimeout);
    event RatioChanged(
        uint8 newMolecular,
        uint8 newDenominator,
        uint8 oldMolecular,
        uint8 oldDenominator
    );

    error SignerIndexOutOfRange();
    error SignerAlreadyExists();
    error SignerNotFound();
    error UnableRemoveOnlySigner();
    error MolecularLessThanOne();
    error MolecularGreaterThanDenominator();
    error MsgSenderNotSigner();
    error SignTimeoutLessThan30Seconds();
    error SignerCountExceed65536();

    constructor() {
        _addSigner(msg.sender);
    }

    function _clearAll(uint len) internal {
        for (uint i = 0; i < len; i++) {
            (address signer, uint existingHash) = _signers.at(i);
            if (existingHash != 0) {
                _signers.set(signer, 0);
            }
        }
    }

    function _multiSigned(
        address msgSender,
        bytes memory msgData
    ) internal returns (bool passed) {
        if (!_signers.contains(msgSender)) {
            revert MsgSenderNotSigner();
        }
        uint len = _signers.length();
        if (len == 1) {
            return true;
        }

        uint operationHash = uint(keccak256(msgData));
        uint signedCount = 1;
        bool expired = lastSignTimestamp + signTimeout < block.timestamp;
        if (expired) {
            _clearAll(len);
        } else {
            for (uint i = 0; i < len; i++) {
                (address signer, uint existingHash) = _signers.at(i);
                if (signer == msgSender) {
                    continue;
                }
                if (existingHash == operationHash) {
                    signedCount += 1;
                } else if (existingHash != 0) {
                    _signers.set(signer, 0);
                }
            }
        }

        passed = signedCount * denominator >= len * molecular;
        lastSignTimestamp = uint64(block.timestamp);
        emit MultiSigned(
            msgSender,
            passed,
            bytes4(msgData),
            uint16(signedCount),
            operationHash
        );
        if (passed) {
            _clearAll(len);
        } else {
            _signers.set(msgSender, operationHash);
        }
    }

    modifier onlyMultiSigned() {
        if (_multiSigned(msg.sender, msg.data)) {
            _;
        }
    }

    function getSigners() public view returns (address[] memory) {
        return _signers.keys();
    }

    function getSignerCount() public view returns (uint) {
        return _signers.length();
    }

    function isSigner(address addr) public view returns (bool) {
        return _signers.contains(addr);
    }

    function getSignerAt(
        uint index
    ) public view returns (address signer, uint operationHash) {
        if (index >= _signers.length()) {
            revert SignerIndexOutOfRange();
        }
        (signer, operationHash) = _signers.at(index);
    }

    function _addSigner(address signer) internal {
        if (_signers.contains(signer)) {
            revert SignerAlreadyExists();
        }
        if (_signers.length() >= 65536) {
            revert SignerCountExceed65536();
        }
        _signers.set(signer, 0);
        emit SignerAdded(signer);
    }

    function addSigner(address signer) external onlyMultiSigned {
        _addSigner(signer);
    }

    function addSigners(address[] memory signers) external onlyMultiSigned {
        uint len = signers.length;
        for (uint i = 0; i < len; i++) {
            _addSigner(signers[i]);
        }
    }

    function _removeSigner(address signer) internal {
        if (!_signers.contains(signer)) {
            revert SignerNotFound();
        }
        if (_signers.length() == 1) {
            revert UnableRemoveOnlySigner();
        }
        _signers.remove(signer);
        emit SignerRemoved(signer);
    }

    function removeSigner(address signer) external onlyMultiSigned {
        _removeSigner(signer);
    }

    function removeSigners(address[] memory signers) external onlyMultiSigned {
        uint len = signers.length;
        for (uint i = 0; i < len; i++) {
            _removeSigner(signers[i]);
        }
    }

    function getRatio() public view returns (uint8, uint8) {
        return (molecular, denominator);
    }

    function setRatio(
        uint8 newMolecular,
        uint8 newDenominator
    ) external onlyMultiSigned {
        if (newMolecular < 1) {
            revert MolecularLessThanOne();
        }
        if (newMolecular > newDenominator) {
            revert MolecularGreaterThanDenominator();
        }
        emit RatioChanged(newMolecular, newDenominator, molecular, denominator);
        molecular = newMolecular;
        denominator = newDenominator;
    }

    function setSignTimeout(uint32 newSignTimeout) external onlyMultiSigned {
        if (newSignTimeout < 30) {
            revert SignTimeoutLessThan30Seconds();
        }
        emit SignTimeoutChanged(newSignTimeout, signTimeout);
        signTimeout = newSignTimeout;
    }
}
