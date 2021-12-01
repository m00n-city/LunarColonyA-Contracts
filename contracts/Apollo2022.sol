/**
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// import "hardhat/console.sol";

/**
 * @title Apollo2022 Boarding Passes Contract
 * @dev Extends ERC721 Non-Fungible Token Standard basic implementation
 */
contract Apollo2022 is ERC721, ERC721Enumerable, ERC721Burnable, Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant maxSupply = 10000;
    uint256 public constant maxMintsPerAddr = 5;
    uint256 public constant maxClaimsPerAddr = 1;
    uint256 public constant buyPrice = 0.01 ether;
    uint256 private reserveMaxAmount = 500;
    uint256 public reserveAmount;
    uint256 public releaseStart;
    uint256 public releaseEnd;
    uint256 public releaseDuration;
    uint256 public releaseMaxSupply;
    uint256 public releaseMinted;
    uint256 public curMaxSupply;

    IERC20 public immutable weth;

    string private __baseURI;

    mapping(address => uint256) public mintsPerAddr;
    mapping(address => uint256) public claimsPerAddr;
    address[] public holders;

    constructor(IERC20 _weth)
        ERC721("Apollo2022 Boarding Passes", "Apollo2022")
        ERC721Enumerable()
    {
        weth = _weth;
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
    }

    function withdrawWETH() external onlyOwner {
        weth.safeTransfer(msg.sender, weth.balanceOf(address(this)));
    }

    function setBaseURI(string memory newBaseURI) external onlyOwner {
        __baseURI = newBaseURI;
    }

    function _baseURI() internal view override returns (string memory) {
        return __baseURI;
    }

    function available() public view returns (uint256) {
        uint256 remaining = releaseMaxSupply - releaseMinted;
        if (block.timestamp < releaseStart) {
            // console.log("< releaseStart; 0");
            return 0;
        } else if (block.timestamp > releaseEnd) {
            // console.log("> releaseEnd; remaining");
            return remaining;
        } else {
            uint256 released = (releaseMaxSupply * (block.timestamp - releaseStart)) /
                releaseDuration;

            // console.log("released=%s minted=%s", released, releaseMinted);
            return (released > releaseMinted) ? released - releaseMinted : 0;
        }
    }

    /**
     * @notice Claim free ticket
     */
    function claimTicket() external onlyEOA {
        require(claimsPerAddr[msg.sender] < maxClaimsPerAddr, "Max claims per address exceeded");
        require(mintsPerAddr[msg.sender] < maxMintsPerAddr, "Max mints per address exceeded");
        require(totalSupply() <= curMaxSupply, "Mint would exceed max supply of Tickets");
        require(available() > 0, "No tickets available");

        claimsPerAddr[msg.sender]++;
        _releaseMint(msg.sender);
    }

    /**
     * @notice Buy ticket
     */
    function buyTicket(address to, uint256 numberOfTokens) external onlyEOA {
        require(
            mintsPerAddr[to] + numberOfTokens <= maxMintsPerAddr,
            "Max mints per address exceeded"
        );
        require(
            totalSupply() + numberOfTokens <= curMaxSupply,
            "Mint would exceed max supply of Tickets"
        );

        uint256 amount = numberOfTokens * buyPrice;
        weth.safeTransferFrom(address(msg.sender), address(this), amount);

        for (uint256 i = 0; i < numberOfTokens; i++) {
            _releaseMint(to);
        }
    }

    function reserveTickets(address to, uint256 numberOfTokens) external onlyOwner {
        require(
            curMaxSupply + numberOfTokens <= maxSupply,
            "Mint would exceed max supply of Tickets"
        );
        require(
            reserveAmount + numberOfTokens <= reserveMaxAmount,
            "Mint would exeed max allowed amount"
        );
        curMaxSupply += numberOfTokens;
        reserveAmount += numberOfTokens;

        for (uint256 i = 0; i < numberOfTokens; i++) {
            _mintNext(to);
        }
    }

    function _releaseMint(address to) internal {
        if (mintsPerAddr[to] == 0) {
            holders.push(to);
        }
        mintsPerAddr[to]++;
        releaseMinted++;

        _mintNext(to);
    }

    function _mintNext(address to) internal {
        require(totalSupply() <= maxSupply, "Mint would exceed max supply of Tickets");
        uint256 tokenId = totalSupply();

        _mint(to, tokenId);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

        return _baseURI();
    }

    function holdersLength() external view returns (uint256) {
        return holders.length;
    }

    function getHolders() external view returns (address[] memory) {
        return holders;
    }

    function getHolders(uint256 offset, uint256 limit) external view returns (address[] memory) {
        address[] memory result = new address[](limit);

        for (uint256 i = 0; i < limit; i++) {
            result[i] = holders[i + offset];
        }

        return result;
    }

    /**********************************************/

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }
}
