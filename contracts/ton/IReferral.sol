// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;
pragma abicoder v2;

interface IReferral {
    function referrals(address referree) external view returns (address referrer);
    function activeReferral(address referrer) external;
}