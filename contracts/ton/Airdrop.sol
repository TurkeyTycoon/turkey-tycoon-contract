// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;
pragma abicoder v2;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "../multisign/MultiSignOwnable.sol";
import "../common/IMintableERC20.sol";
import "./IFairMint.sol";

contract Airdrop is MultiSignOwnable, EIP712 {
    struct AccountData {
        address owner;
        uint premintCount;
        uint r1Amount;
        uint r2Amount;
        uint totalAmount;
        uint collectedAmount;
        uint availableAmount;
        uint64 endBlock;
        uint64 endTimestamp;
    }

    error SignatureExpired();
    error InvalidSignature();
    error AvailableAmountIsZero();
    error InsufficientAvailableAmount();
    error FairMintRecordNotExists();

    address public signerAddress;

    IMintableERC20 public airdropToken;
    IFairMint public fairMint;

    uint32 public signatureTimeout = 3600 * 24;

    bytes32 public constant DATA_TYPE_HASH =
        keccak256(
            "Data(address signer,address receiver,address airdropToken,uint64 timestamp)"
        );

    mapping(address => uint256) public collectedAmounts;

    event AirdropCollected(
        address indexed airdropToken,
        address indexed to,
        uint256 currentCollected,
        uint256 totalCollected
    );

    constructor(
        address initialFairMint,
        address multiSignAdmin
    ) MultiSignOwnable(multiSignAdmin) EIP712("Airdrop", "1.0") {
        _setFairMint(initialFairMint);
        signerAddress = msg.sender;
    }

    function _calcDigest(
        address account,
        uint64 timestamp
    ) internal view returns (bytes32) {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(
                        DATA_TYPE_HASH,
                        signerAddress,
                        account,
                        airdropToken,
                        timestamp
                    )
                )
            );
    }

    function checkSignature(
        address account,
        uint64 timestamp,
        bytes memory signature
    ) public view returns (bool) {
        return
            signerAddress == ECDSA.recover(_calcDigest(account, timestamp), signature);
    }

    function collectAirdrop(uint64 timestamp, bytes memory signature) public {
        if (timestamp + signatureTimeout < block.timestamp) {
            revert SignatureExpired();
        }
        if (!checkSignature(msg.sender, timestamp, signature)) {
            revert InvalidSignature();
        }
        _collectAirdrop(msg.sender);
    }

    function _collectAirdrop(address account) internal {
        AccountData memory d = getAccountData(account);
        if (d.premintCount <= 0) {
            revert FairMintRecordNotExists();
        }
        if (d.availableAmount <= 0) {
            revert InsufficientAvailableAmount();
        }

        collectedAmounts[account] += d.availableAmount;
        airdropToken.mint(account, d.availableAmount);
        emit AirdropCollected(
            address(airdropToken),
            account,
            d.availableAmount,
            d.totalAmount
        );
    }

    function getAccountData(
        address account
    ) public view returns (AccountData memory d) {
        IFairMint.AccountData memory f = fairMint.getAccountData(account);
        d.owner = account;
        d.premintCount = f.r0.successCount + f.r0.failedCount;
        d.r1Amount = f.r1Amount;
        d.r2Amount = f.r2Amount;
        d.totalAmount = f.totalAmount;
        d.collectedAmount = collectedAmounts[account];
        d.availableAmount = d.totalAmount - d.collectedAmount;
        d.endBlock = uint64(block.number);
        d.endTimestamp = uint64(block.timestamp);
    }

    function _setFairMint(address newFairMint) internal {
        fairMint = IFairMint(newFairMint);
        airdropToken = fairMint.mintToken();
    }

    function setFairMint(address newFairMint) external onlyMultiSignAuthorized {
        _setFairMint(newFairMint);
    }

    function setSignatureTimeout(
        uint32 newSignatureTimeout
    ) external onlyMultiSignAuthorized {
        signatureTimeout = newSignatureTimeout;
    }

    function setSignerAddress(address newSignerAddress) external onlyMultiSignAuthorized {
        signerAddress = newSignerAddress;
    }
}
