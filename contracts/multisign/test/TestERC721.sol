// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "../MultiSignOwnable.sol";

contract TestERC721 is ERC721, MultiSignOwnable {
    constructor(
        address multiSignAdmin
    ) MultiSignOwnable(multiSignAdmin) ERC721("TestERC721", "TestERC721") {
        _mint(msg.sender, 1);
        _mint(msg.sender, 2);
        _mint(msg.sender, 3);
        _mint(msg.sender, 4);
        _mint(msg.sender, 5);
        _mint(msg.sender, 6);
        _mint(msg.sender, 7);
        _mint(msg.sender, 8);
        _mint(msg.sender, 9);
        _mint(msg.sender, 10);
    }

    function mint(address to, uint256 tokenId) external onlyMultiSignAuthorized {
        _mint(to, tokenId);
    }

    function burn(uint256 tokenId) external onlyMultiSignAuthorized {
        _burn(tokenId);
    }
}
