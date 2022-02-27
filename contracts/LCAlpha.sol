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
contract LCAlpha is ERC721, Ownable {
    using Strings for uint256;

    enum SaleState {
        Paused,
        BoardingPass,
        Open
    }

    string public provenance;
    uint256 public mintPrice = 0.08 ether;
    uint256 public constant bpMintPrice = 0.06 ether;
    uint256 public constant maxPurchase = 20 + 1;
    uint256 public constant maxSupply = 10000 + 1;
    uint256 public constant reservedTokens = 50;
    bytes32 public merkleRoot;
    address public proxyRegistryAddress;
    string public baseURI;
    string public preRevealURI;

    SaleState public saleState = SaleState.Paused;

    uint256 public totalSupply;
    mapping(address => uint256) public bpMintsPerAddr;

    modifier validateEthAmount(uint256 price, uint256 amount) {
        require(price * amount == msg.value, "Incorrect ETH value sent");
        _;
    }

    modifier saleIsActive(SaleState state) {
        require(saleState == state, "Sale not active");
        _;
    }

    constructor() ERC721("Lunar Colony Alpha", "LCA") {}

    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        payable(msg.sender).transfer(balance);
    }

    /**
     * @notice reserve for DAO
     */
    function reserveTokens(address to) public onlyOwner {
        for (uint256 i = 0; i < reservedTokens; i++) {
            _mintNext(to);
        }
    }

    /**
     * @notice Set provenance once it's calculated
     */
    function setProvenanceHash(string memory provenanceHash) public onlyOwner {
        provenance = provenanceHash;
    }

    function setBaseURI(string memory newBaseURI) public onlyOwner {
        baseURI = newBaseURI;
    }

    function setPreRevealURI(string memory newPreRevealURI) public onlyOwner {
        preRevealURI = newPreRevealURI;
    }

    function setMintPrice(uint256 newMintPrice) public onlyOwner {
        mintPrice = newMintPrice;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function setSaleState(SaleState newSaleState) public onlyOwner {
        saleState = newSaleState;
    }

    function setMerkleRoot(bytes32 newMerkleRoot) external onlyOwner {
        merkleRoot = newMerkleRoot;
    }

    function setProxyRegistryAddress(address _proxyRegistryAddress) external onlyOwner {
        proxyRegistryAddress = _proxyRegistryAddress;
    }

    /**
     * @notice Mint for boarding pass holders
     */
    function bpMint(
        uint256 amount,
        uint256 allowedAmount,
        bytes32[] calldata proof
    ) public payable saleIsActive(SaleState.BoardingPass) validateEthAmount(bpMintPrice, amount) {
        require(
            MerkleProof.verify(
                proof,
                merkleRoot,
                keccak256(abi.encodePacked(msg.sender, allowedAmount))
            ),
            "Invalid Merkle Tree proof supplied"
        );
        require(bpMintsPerAddr[msg.sender] + amount <= allowedAmount, "Exceeds allowed amount");

        bpMintsPerAddr[msg.sender] += amount;

        for (uint256 i = 0; i < amount; i++) {
            _mintNext(msg.sender);
        }
    }

    /**
     * @notice Public mint
     */
    function mint(uint256 amount)
        public
        payable
        saleIsActive(SaleState.Open)
        validateEthAmount(mintPrice, amount)
    {
        require(amount < maxPurchase, "Max purchase exceeded");
        require(totalSupply + amount < maxSupply, "Purchase would exceed max supply");

        for (uint256 i = 0; i < amount; i++) {
            _mintNext(msg.sender);
        }
    }

    function _mintNext(address to) private {
        _mint(to, totalSupply);
        unchecked {
            totalSupply++;
        }
    }

    function walletOfOwner(address ownerAddr) public view returns (uint256[] memory) {
        uint256 balance = balanceOf(ownerAddr);
        uint256[] memory tokens = new uint256[](balance);
        uint256 tokenId;
        uint256 found;

        while (found < balance) {
            if (_exists(tokenId) && ownerOf(tokenId) == ownerAddr) {
                tokens[found++] = tokenId;
            }
            tokenId++;
        }

        return tokens;
    }

    /**
     * Override isApprovedForAll to whitelist user's OpenSea proxy accounts to enable gas-less listings.
     */
    function isApprovedForAll(address owner, address operator) public view override returns (bool) {
        // Whitelist OpenSea proxy contract for easy trading.
        ProxyRegistry proxyRegistry = ProxyRegistry(proxyRegistryAddress);
        if (address(proxyRegistry.proxies(owner)) == operator) {
            return true;
        }

        return super.isApprovedForAll(owner, operator);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

        string memory __baseURI = _baseURI();
        return
            bytes(__baseURI).length > 0
                ? string(abi.encodePacked(__baseURI, tokenId.toString()))
                : preRevealURI;
    }
}

contract OwnableDelegateProxy {}

/**
 * Used to delegate ownership of a contract to another address, to save on unneeded transactions to approve contract use for users
 */
contract ProxyRegistry {
    mapping(address => OwnableDelegateProxy) public proxies;
}
