// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;
pragma abicoder v2;

import "../RandomSource.sol";

contract TestTxPrice {
    uint public txPrice;
    uint public transferGas;
    uint public baseFee;

    constructor() {
        txPrice = tx.gasprice;
    }

    function updateTxPrice() external payable returns (uint, uint, uint) {
        txPrice = tx.gasprice;
        uint256 g1 = gasleft();
        payable(msg.sender).transfer(msg.value >> 1);
        uint256 g2 = gasleft();
        transferGas = g1 - g2;
        baseFee = block.basefee;

        return (txPrice, transferGas, baseFee);
    }

    function get() public view returns (uint, uint, uint) {
        return (txPrice, transferGas, baseFee);
    }
}
