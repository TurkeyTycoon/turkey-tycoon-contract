// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../MultiSignOwnable.sol";

contract TestMultiSignOwnable is ERC20, MultiSignOwnable {
    constructor(
        address multiSignAdmin
    ) MultiSignOwnable(multiSignAdmin) ERC20("TMSO", "TMSO") {}

    function mint(address to, uint256 amount) external onlyMultiSignAuthorized {
        _mint(to, amount);
    }

    function burn(address to, uint256 amount) external onlyMultiSignAuthorized {
        _burn(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
