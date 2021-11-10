/**
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";


/**
 * @title Apollo2022 Boarding Passes Contract
 * @dev Extends ERC721 Non-Fungible Token Standard basic implementation
 */
contract Apollo2022 is ERC721, ERC721Enumerable, ERC721Burnable, Ownable {
    using Strings for uint256;
    using SafeERC20 for IERC20;


    uint256 public constant maxSupply = 10000;
    uint256 public constant maxPerAddr = 5;
    uint256 public constant buyPrice = 0.01 ether;
    uint256 public immutable releaseStart;
    uint256 public immutable releaseEnd;
    uint256 public immutable duration;
    IERC20 public immutable eth;


    string private __baseURI;

    mapping(address => uint256) public tokensPerAddr;
    address[] holders;

    constructor(uint256 _releaseStart, uint256 _releaseEnd, IERC20 _eth)
        ERC721("Apollo2022 Boarding Passes", "Apollo2022")
        ERC721Enumerable()
    {
        releaseStart = _releaseStart;
        releaseEnd = _releaseEnd;
        duration = _releaseEnd - _releaseStart;
        eth = _eth;
    }

    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        payable(msg.sender).transfer(balance);
    }

    function withdrawProvidedETH() external onlyOwner {
        eth.safeTransfer(msg.sender, eth.balanceOf(address(this)));
    }

    function setBaseURI(string memory newBaseURI) public onlyOwner {
        __baseURI = newBaseURI;
    }

    function _baseURI() internal view override returns (string memory) {
        return __baseURI;
    }

    function available() public view returns (uint256) {
        uint256 minted = totalSupply();
        uint256 remaining = maxSupply - minted;
        if (block.timestamp > releaseEnd) {
            return remaining;
        } else {
            uint256 released = (maxSupply * (block.timestamp - releaseStart)) /
                duration;

            return (released > minted) ? released - minted : 0;
        }
    }

    /**
     * @notice Claim free ticket
     */
    function claimTicket(address to) external {
        require(
            tokensPerAddr[to] < maxPerAddr,
            "Max limit per address exceeded"
        );

        require(available() > 0, "No tickets available");

        _mintNext(to);
    }
    
    /**
     * @notice Buy ticket
     */
    function buyTicket(address to, uint256 numberOfTokens) external {
        require(
            tokensPerAddr[to] < maxPerAddr,
            "Max limit per address exceeded"
        );
        require(
            totalSupply() + numberOfTokens <= maxSupply,
            "Mint would exceed max supply of Tickets"
        );
        
        uint256 amount = numberOfTokens * buyPrice;
        eth.safeTransferFrom(address(msg.sender), address(this), amount);
        
        for (uint256 i = 0; i < numberOfTokens; i++){
            _mintNext(to);
        }
    }

    function _mintNext(address to) internal {
        require(
            totalSupply() <= maxSupply,
            "Mint would exceed max supply of Tickets"
        );
        uint256 tokenId = totalSupply();

        _mint(to, tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        require(
            _exists(tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );

        return _baseURI();
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
