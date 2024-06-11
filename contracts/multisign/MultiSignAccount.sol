// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;
pragma abicoder v2;

import "./MultiSignCall.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

contract MultiSignAccount is MultiSignCall, ERC721Holder, ERC1155Holder {
    receive() external payable {}

    fallback() external payable {}

    function transferETH(
        address payable to,
        uint value
    ) external onlyMultiSigned {
        to.transfer(value);
    }

    function transferERC20(
        address token,
        address to,
        uint256 value
    ) external onlyMultiSigned {
        IERC20(token).transfer(to, value);
    }

    function transferERC20From(
        address token,
        address from,
        address to,
        uint256 value
    ) external onlyMultiSigned {
        IERC20(token).transferFrom(from, to, value);
    }

    function approveERC20(
        address token,
        address spender,
        uint256 value
    ) external onlyMultiSigned {
        IERC20(token).approve(spender, value);
    }

    function transferERC721(
        address token,
        address to,
        uint256 tokenId
    ) external onlyMultiSigned {
        IERC721(token).safeTransferFrom(
            IERC721(token).ownerOf(tokenId),
            to,
            tokenId
        );
    }

    function approveERC721(
        address token,
        address spender,
        uint256 tokenId
    ) external onlyMultiSigned {
        IERC721(token).approve(spender, tokenId);
    }

    function setApprovalERC721ForAll(
        address token,
        address operator,
        bool approved
    ) external onlyMultiSigned {
        IERC721(token).setApprovalForAll(operator, approved);
    }

    function transferERC1155From(
        address token,
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external onlyMultiSigned {
        IERC1155(token).safeTransferFrom(from, to, id, value, data);
    }

    function batchTransferERC1155From(
        address token,
        address from,
        address to,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external onlyMultiSigned {
        IERC1155(token).safeBatchTransferFrom(
            from,
            to,
            ids,
            values,
            data
        );
    }

    function setApprovalERC1155ForAll(
        address token,
        address operator,
        bool approved
    ) external onlyMultiSigned {
        IERC1155(token).setApprovalForAll(operator, approved);
    }
}
