// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;
pragma abicoder v2;

import "./IRandomSource.sol";

contract RandomSource is IRandomSource {
    uint internal _prevRandom;

    address constant weth9 = 0x4200000000000000000000000000000000000006;
    address constant SequencerFeeVault = 0x4200000000000000000000000000000000000011;

    constructor() {
        _prevRandom = _random();
    }

    function _random() internal view returns (uint) {
        return
            uint(
                keccak256(
                    abi.encodePacked(
                        weth9.balance,
                        block.coinbase.balance,
                        SequencerFeeVault.balance,
                        block.prevrandao,
                        uint160(msg.sender),
                        uint160(address(block.coinbase)),
                        uint32(block.chainid),
                        uint32(block.number),
                        uint32(gasleft()),
                        _prevRandom
                    )
                )
            );
    }

    function random() public override returns (uint) {
        _prevRandom = _random();
        return _prevRandom;
    }
}
