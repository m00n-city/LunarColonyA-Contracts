/**
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

/**
 * @title LunarColonyAlpha contract
 * @dev Extends ERC721 Non-Fungible Token Standard basic implementation
 */
contract LCAlpha is ERC721, ERC721Enumerable, Ownable {
    enum SaleState {
        Paused,
        Apollo2022,
        Open
    }

    string public PROVENANCE;
    uint256 public constant PRICE = 0.08 ether;
    uint256 public constant MAX_PURCHASE = 20 + 1;
    uint256 public constant MAX_SUPPLY = 10000 + 1;
    uint256 public constant RESERVED_TOKENS = 100;
    bytes32 public merkleRoot;

    string public baseURI;
    SaleState saleState = SaleState.Paused;

    constructor()
        ERC721('Lunar Colony Alpha', 'LCA')
        ERC721Enumerable()
    {}

    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        payable(msg.sender).transfer(balance);
    }

    /**
     * reserve for DAO
     */
    function reserveTokens() public onlyOwner {
        uint256 supply = totalSupply();
        uint256 i;
        for (i = 0; i < RESERVED_TOKENS; i++) {
            _safeMint(msg.sender, supply + i);
        }
    }

    /*
     * Set provenance once it's calculated
     */
    function setProvenanceHash(string memory provenanceHash) public onlyOwner {
        PROVENANCE = provenanceHash;
    }

    function setBaseURI(string memory newBaseURI) public onlyOwner {
        baseURI = newBaseURI;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function saleIsActive() public view returns (bool) {
        return saleState != SaleState.Paused;
    }

    /**
     * @notice Set sale state
     */
    function setSaleState(SaleState newSaleState) public onlyOwner {
        saleState = newSaleState;
    }

    function setMerkleRoot(bytes32 newMerkleRoot) external onlyOwner {
        merkleRoot = newMerkleRoot;
    }

    /**
     * Mint tokens
     */
    function mint(uint256 numberOfTokens) public payable {
        require(saleIsActive(), "Sale must be active");
        require(
            numberOfTokens < MAX_PURCHASE,
            "Max purchase exceeded"
        );
        require(
            totalSupply() + numberOfTokens < MAX_SUPPLY,
            "Purchase would exceed max supply"
        );
        require(
            PRICE * numberOfTokens == msg.value,
            "Ether value sent is not correct"
        );

        for (uint256 i = 0; i < numberOfTokens; i++) {
            uint256 mintIndex = totalSupply();
            _safeMint(msg.sender, mintIndex);
        }
    }

    /* */
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
