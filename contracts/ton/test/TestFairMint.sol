// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;
pragma abicoder v2;

import "../FairMint.sol";

contract TestFairMint is FairMint {
    constructor(
        address initialToken,
        address initialEthUsdPriceFeeder,
        address initialEthReceiverAdmin,
        address initialUniswapPool,
        address multiSignAdmin
    )
        FairMint(
            initialToken,
            initialEthUsdPriceFeeder,
            initialEthReceiverAdmin,
            initialUniswapPool,
            multiSignAdmin
        )
    {}

    function _addPremint(Premint memory p) internal override {
        p.confirmBlockNumber = uint64(block.number + 4);
        super._addPremint(p);
    }

    function _mint(Premint memory p) internal override {
        bool succ = p.expectMintAmount % 2 == 0;
        if (succ) {
            _mintSucc(p);
        } else {
            _mintFailed(p);
        }
    }

    function _addLiquidity() internal override {
        
    }
}
