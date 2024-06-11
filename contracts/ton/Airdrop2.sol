// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;
pragma abicoder v2;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "../multisign/MultiSignOwnable.sol";
import "../common/IMintableERC20.sol";

contract Airdrop2 is MultiSignOwnable, EIP712 {
    error SignatureExpired();
    error InvalidSignature();
    error AvailableAmountIsZero();
    error InsufficientAvailableAmount();
    error FairMintRecordNotExists();
    error NotEnabled();

    address public signerAddress;
    address public airdropTokenSender;

    IMintableERC20 public airdropToken;

    uint32 public signatureTimeout = 3600 * 24;

    bool public enabled = false;

    bytes32 public constant DATA_TYPE_HASH =
        keccak256(
            "Data(address signer,address receiver,address airdropToken,uint64 timestamp,uint256 totalReleased)"
        );

    mapping(address => uint256) public collectedAmounts;

    event Airdrop2Collected(
        address indexed airdropToken,
        address tokenSender,
        address indexed to,
        uint256 currentCollected,
        uint256 totalCollected
    );

    constructor(
        address initialAirdropToken,
        address multiSignAdmin
    ) MultiSignOwnable(multiSignAdmin) EIP712("Airdrop2", "1.0") {
        _setAirdropToken(initialAirdropToken);
        signerAddress = msg.sender;
    }

    function _calcDigest(
        address account,
        uint64 timestamp,
        uint256 totalReleased
    ) internal view returns (bytes32) {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        DATA_TYPE_HASH,
                        signerAddress,
                        account,
                        airdropToken,
                        timestamp,
                        totalReleased
                    )
                )
            );
    }

    function checkSignature(
        address account,
        uint64 timestamp,
        uint256 totalReleased,
        bytes memory signature
    ) public view returns (bool) {
        return
            signerAddress == ECDSA.recover(_calcDigest(account, timestamp, totalReleased), signature);
    }

    function collectAirdrop2(uint64 timestamp, uint256 totalReleased, bytes memory signature) public {
        if(!enabled){
            revert NotEnabled();
        }

        if (timestamp + signatureTimeout < block.timestamp) {
            revert SignatureExpired();
        }
        if (!checkSignature(msg.sender, timestamp,totalReleased, signature)) {
            revert InvalidSignature();
        }
        _collectAirdrop2(msg.sender, totalReleased);
    }

    function _collectAirdrop2(address account, uint256 totalReleased) internal {
        if (collectedAmounts[account] >= totalReleased) {
            revert InsufficientAvailableAmount();
        }
        uint256 availableAmount = totalReleased - collectedAmounts[account];
        collectedAmounts[account] += availableAmount;
        airdropToken.transferFrom(airdropTokenSender, account, availableAmount);
        emit Airdrop2Collected(
            address(airdropToken),
            airdropTokenSender,
            account,
            availableAmount,
            totalReleased
        );
    }

    function _setAirdropToken(address newAirdropToken) internal {
        airdropToken = IMintableERC20(newAirdropToken);
    }

    function setAirdropToken(address newAirdropToken) external onlyMultiSignAuthorized {
        _setAirdropToken(newAirdropToken);
    }

    
    function setAirdropTokenSender(address newAirdropTokenSender) external onlyMultiSignAuthorized {
        airdropTokenSender =  newAirdropTokenSender;
    }

    function setSignatureTimeout(
        uint32 newSignatureTimeout
    ) external onlyMultiSignAuthorized {
        signatureTimeout = newSignatureTimeout;
    }

    function setSignerAddress(address newSignerAddress) external onlyMultiSignAuthorized {
        signerAddress = newSignerAddress;
    }

    function setEnabled(bool isEnabled) external onlyMultiSignAuthorized {
        enabled = isEnabled;
    }
}
