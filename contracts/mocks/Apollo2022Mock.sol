/**
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

pragma solidity ^0.8.0;

import "../Apollo2022.sol";

contract Apollo2022Mock is Apollo2022 {
    constructor(
        uint256 _releaseStart,
        uint256 _releaseEnd,
        IERC20 _weth
    ) Apollo2022(_releaseStart, _releaseEnd, _weth) {}

    function bulkMint(address[] memory accounts) public onlyOwner {
        for (uint256 account = 0; account < accounts.length; account++) {
            _mintNext(accounts[account]);
        }
    }
}
