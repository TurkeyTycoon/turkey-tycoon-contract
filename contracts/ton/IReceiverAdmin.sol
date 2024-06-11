// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;
pragma abicoder v2;

interface IReceiverAdmin {
    function isReceiver(address addr) external view returns (bool);

    function getReceivers() external view returns (address[] memory);

    function getReceiverCount() external view returns (uint256);

    function getReceiverAt(uint256 index) external view returns (address);

    function addReceiver(address receiver) external;

    function addReceivers(address[] memory receivers) external;

    function removeReceiver(address receiver) external;

    function removeReceivers(address[] memory receivers) external;
}
