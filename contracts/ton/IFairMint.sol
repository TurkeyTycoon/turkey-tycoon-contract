// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;
pragma abicoder v2;

import "../common/IMintableERC20.sol";

interface IFairMint {
    struct Premint {
        address msgSender;
        uint64 confirmBlockNumber;
        uint extraGasFee;
        uint confirmGasFee;
        uint expectMintAmount;
    }

    struct Record {
        uint mintedAmount;
        uint successEthAmount;
        uint failedEthAmount;
        uint successCount;
        uint failedCount;
    }

    struct Account {
        Record r0;
        Record r1;
        Record r2;
    }

    struct AccountData {
        address owner;
        Record r0;
        Record r1;
        Record r2;
        uint r1Amount;
        uint r2Amount;
        uint totalAmount;
        uint64 endBlock;
        uint64 endTimestamp;
    }

    function mintToken() external view returns (IMintableERC20);

    function getAccountData(
        address account
    ) external view returns (AccountData memory data);
}
