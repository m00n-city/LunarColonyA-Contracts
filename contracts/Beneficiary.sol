// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-4.5/finance/PaymentSplitter.sol";
import "@openzeppelin/contracts-4.5/access/Ownable.sol";
import "@openzeppelin/contracts-4.5/utils/Address.sol";
import "@openzeppelin/contracts-4.5/security/ReentrancyGuard.sol";

contract Beneficiary is Ownable, ReentrancyGuard {
    address[] public payees;
    uint256[] public shares;

    constructor(address[] memory _payees, uint256[] memory _shares) {
        _setPayees(_payees, _shares);
    }

    receive() external payable {}

    function setPayees(address[] memory _payees, uint256[] memory _shares) external onlyOwner {
        _setPayees(_payees, _shares);
    }

    function _setPayees(address[] memory _payees, uint256[] memory _shares) internal {
        require(_payees.length == _shares.length, "Incorrect data");

        uint256 allShares = 0;
        for (uint256 i; i < _shares.length; i++) {
            allShares += _shares[i];
        }
        require(allShares == 100, "Shares sum != 100");

        payees = _payees;
        shares = _shares;
    }

    function withdraw() public nonReentrant {
        uint256 balance = address(this).balance;
        for (uint256 i = 0; i < payees.length; i++) {
            uint256 value = (balance * shares[i]) / 100;
            Address.sendValue(payable(payees[i]), value);
        }
    }
}
