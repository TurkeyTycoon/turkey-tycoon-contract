// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "../MultiSignOwnable.sol";

contract TestERC1155 is ERC1155, MultiSignOwnable {
    constructor(
        address multiSignAdmin
    ) MultiSignOwnable(multiSignAdmin) ERC1155("http://localhost/testerc1155/") {
        uint[] memory ids = new uint[](10);
        uint[] memory values = new uint[](10);
        for (uint i = 0; i < 10; i++) {
            ids[i] = i + 1;
            values[i] = 10000;
        }

        _mintBatch(msg.sender, ids, values, "");
    }

    function mint(
        address to,
        uint256 id,
        uint256 value,
        bytes memory data
    ) external onlyMultiSignAuthorized {
        _mint(to, id, value, data);
    }

    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    ) external onlyMultiSignAuthorized {
        _mintBatch(to, ids, values, data);
    }

    function burn(
        address from,
        uint256 id,
        uint256 value
    ) external onlyMultiSignAuthorized {
        _burn(from, id, value);
    }

    function burnBatch(
        address from,
        uint256[] memory ids,
        uint256[] memory values
    ) external onlyMultiSignAuthorized {
        _burnBatch(from, ids, values);
    }
}
