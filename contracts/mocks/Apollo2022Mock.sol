/**
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

pragma solidity ^0.8.0;

import "../Apollo2022.sol";

contract Apollo2022Mock is Apollo2022 {
    
    constructor(
        string memory _uri,
        IERC20 _weth
    ) Apollo2022(_uri, _weth) {}

    function bulkMint(address[] memory accounts) public onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            _mintTickets(accounts[i], 1);
        }

    }

    function claimTicketVulnerable() external {
        require(claimsPerAddr[msg.sender] < maxClaimsPerAddr, "Max claims per address exceeded");
        require(mintsPerAddr[msg.sender] < maxMintsPerAddr, "Max mints per address exceeded");
        require(totalTicketSupply() < curMaxSupply, "Mint would exceed max supply of Tickets");
        require(available() > 0, "No tickets available");

        claimsPerAddr[msg.sender]++;
        _releaseMint(msg.sender, 1);

        emit ClaimTicket(msg.sender);
    }
}
