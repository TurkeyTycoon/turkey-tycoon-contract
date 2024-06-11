// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
interface IMintableERC20 is IERC20Metadata {
    function mint(address to, uint256 amount) external;
    function burn(address to, uint256 amount) external;
}