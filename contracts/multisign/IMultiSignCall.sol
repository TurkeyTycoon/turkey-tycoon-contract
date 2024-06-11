// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;
pragma abicoder v2;

interface IMultiSignCall {
    function multiSigned(
        address msgSender,
        bytes memory msgData
    ) external returns (bool passed);
}
