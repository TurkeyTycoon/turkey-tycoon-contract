// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "../multisign/MultiSignOwnable.sol";

contract TMARS is ERC20, MultiSignOwnable {
    using EnumerableSet for EnumerableSet.AddressSet;

    uint96 public constant MAX_SUPPLY = 7 * 10 ** 27;
    EnumerableSet.AddressSet internal _admins;

    error ExceedMaxSupply();

    constructor(
        address multiSignAdmin
    ) MultiSignOwnable(multiSignAdmin) ERC20("TMARS", "TMARS") {}

    function mint(address to, uint256 amount) external adminOrMultiSigned {
        if (totalSupply() + amount > MAX_SUPPLY) {
            revert ExceedMaxSupply();
        }
        _mint(to, amount);
    }

    modifier adminOrMultiSigned() {
        if (_admins.contains(msg.sender) || owner.multiSigned(msg.sender, msg.data)) {
            _;
        }
    }

    function addAdmin(address admin) external onlyMultiSignAuthorized {
        _admins.add(admin);
    }

    function removeAdmin(address admin) external onlyMultiSignAuthorized {
        _admins.remove(admin);
    }

    function getAdmins() public view returns (address[] memory) {
        return _admins.values();
    }
}
