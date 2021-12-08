// SPDX-License-Identifier: MIT


pragma solidity ^0.8.0;

import "./AbstractApollo2022.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Apollo2022 Boarding Passes Contract
 * @dev Extends ERC1155 Token Standard basic implementation
 */
contract Apollo2022 is AbstractApollo2022 {
    using SafeERC20 for IERC20;

    event ClaimTicket(address indexed account);
    event BuyTicket(address indexed account, address indexed sender, uint256 amount);
    event SetupRelease(uint256 start, uint256 end, uint256 supply);
    event ReserveTickets(address indexed account, uint256 amount);

    uint256 public constant maxSupply = 10000;
    /// @dev buys + claims <= maxMintsPerAddr
    uint256 public constant maxMintsPerAddr = 5;
    uint256 public constant maxClaimsPerAddr = 1;
    uint256 public constant buyPrice = 0.01 ether;
    uint256 public reserveMaxAmount = 1000;
    uint256 public reserveAmount;
    uint256 public releaseStart;
    uint256 public releaseEnd;
    uint256 public releaseDuration;
    uint256 public releaseMaxSupply;
    uint256 public releaseMinted;
    uint256 public curMaxSupply;

    IERC20 public immutable weth;

    mapping(address => uint256) public mintsPerAddr;
    mapping(address => uint256) public claimsPerAddr;

    constructor(string memory _uri, IERC20 _weth)
        ERC1155(_uri) ERC1155Supply()
    {
        weth = _weth;
        name = "LCA Boarding Passes";
        symbol = "LCAPASS";
    }

    modifier onlyEOA() {
        require(msg.sender == tx.origin, "Must use EOA");
        _;
    }

    function setupRelease(
        uint256 _releaseStart,
        uint256 _releaseEnd,
        uint256 _releaseMaxSupply
    ) external onlyOwner {
        require(
            block.timestamp > releaseEnd && available() == 0,
            "Previous release is still running"
        );
        require(curMaxSupply + _releaseMaxSupply <= maxSupply, "Incorrect releaseMaxSupply value");
        releaseStart = _releaseStart;
        releaseEnd = _releaseEnd;
        releaseDuration = _releaseEnd - _releaseStart;
        releaseMaxSupply = _releaseMaxSupply;
        curMaxSupply += _releaseMaxSupply;
        releaseMinted = 0;

        emit SetupRelease(_releaseStart, _releaseEnd, _releaseMaxSupply);
    }

    function withdrawWETH() external onlyOwner {
        weth.safeTransfer(msg.sender, weth.balanceOf(address(this)));
    }

    function available() public view returns (uint256) {
        uint256 remaining = releaseMaxSupply - releaseMinted;
        if (block.timestamp < releaseStart) {
            return 0;
        } else if (block.timestamp > releaseEnd) {
            return remaining;
        } else {
            uint256 released = (releaseMaxSupply * (block.timestamp - releaseStart)) /
                releaseDuration;

            return (released > releaseMinted) ? released - releaseMinted : 0;
        }
    }

    function claimTicket() external onlyEOA {
        require(claimsPerAddr[msg.sender] < maxClaimsPerAddr, "Max claims per address exceeded");
        require(mintsPerAddr[msg.sender] < maxMintsPerAddr, "Max mints per address exceeded");
        require(totalTicketSupply() < curMaxSupply, "Mint would exceed max supply of Tickets");
        require(available() > 0, "No tickets available");

        claimsPerAddr[msg.sender]++;
        _releaseMint(msg.sender, 1);

        emit ClaimTicket(msg.sender);
    }

    function buyTicket(address to, uint256 numberOfTokens) external onlyEOA {
        require(
            mintsPerAddr[to] + numberOfTokens <= maxMintsPerAddr,
            "Max mints per address exceeded"
        );
        require(
            totalTicketSupply() + numberOfTokens <= curMaxSupply,
            "Mint would exceed max supply of Tickets"
        );

        uint256 amount = numberOfTokens * buyPrice;
        weth.safeTransferFrom(address(msg.sender), address(this), amount);

        _releaseMint(to, numberOfTokens);

        emit BuyTicket(to, msg.sender, numberOfTokens);
    }

    function reserveTickets(address to, uint256 numberOfTokens) external onlyOwner {
        require(
            curMaxSupply + numberOfTokens <= maxSupply,
            "Mint would exceed max supply of Tickets"
        );
        require(
            reserveAmount + numberOfTokens <= reserveMaxAmount,
            "Mint would exeed max allowed reserve amount"
        );
        curMaxSupply += numberOfTokens;
        reserveAmount += numberOfTokens;

        _mintTickets(to, numberOfTokens);

        emit ReserveTickets(to, numberOfTokens);
    }

    function _releaseMint(address to, uint256 amount) internal {
        mintsPerAddr[to] += amount;
        releaseMinted += amount;

        _mintTickets(to, amount);
    }
}
