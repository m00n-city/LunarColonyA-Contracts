/**
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

pragma solidity ^0.8.0;

/*
"''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''^
`....................................................................................................`
`......................................'`",;!>~__--_+<!;:"^`'........................................`
`................................'`,!-{1)1{{}|B@$W}}}}}[[[[[[?>:^'...................................`
`.............................^;-{1r*%$$$$$8#x|/xBz\[[[[]]]]]]]]]]?l"'...............................`
`..........................">}}}}n@$$$$$$$$$$$@)]]1\}]]]]]]]??????????~,'............................`
`.......................`I}jM/[[c$8/1[#$$$$$$$$x]]??????????-------------i"..........................`
`.....................^~(c@$W]]]@$/]]]v$$$$$$$W]?-------------_____________+,'.......................`
`...................`~(#$$$$B}??(r]???[B$$$$@n?----_____________++++++++++++~~,......................`
`.................'!}z$$$$$$$&}--------)cM#t?_________+++++++++++~~~~~~~~~~~~~<>^....................`
`................"-r@$$$$$$$$$@r[________-1/}+++++++++~~~~~~~~~~~~~<<<<<<<<<<<<<>;'..................`
`...............I]#$$$$$$$$$$$$$$8M*vnnc&$$$M~~~~~~~~~~~~<<<<<<<<<<<<>>>>>>>>>>>ii!`.................`
`..............!}8$$$$$$$$$$$$$$$$$$$B\/@$%/+~<<<<<<<<<<<<<>>>>>>>>>>>iiiiiiiiiiiii!`................`
`.............i{B$$$$$$$$$$$$$$$8cj|[~<<)v_<<<<<>>>>>>>>>>>iiiiiiiiiiiii!!!!!!!!!!!ll`...............`
`............l?%$$$$$$$$$$$$$$r?<<<<<>>>>>>>>>>>iiiiiiiiiiiii!!!!!!!!!!!!lllllllllllll`..............`
`..........."~#$$$$$$$$$$$$$&?>>>>>>>>iiiiiiiiiiiii!!!!!!!!!!!llllllllllllllIIIIIIIIII;..............`
`..........'>f$$$$$$$$$$$$$%+iiiiiiiiiii!!!!!!!!!!!llllllllllllllIIIIIIIIIIII;;;;;;;;;;".............`
`..........,+@$$$$$$$$$$$$B{i!!!!!!!!!!!!llllllllllllllIIIIIIIIIII;;>](fnc*#MM*cn<;;;;;;'............`
`..........i\$$$$$$$$$$$$$}!]W8&#&%B@@@@B8&#v/?lIIIIIIII;;;;;;;;>(v%$$$$$$$$$$$$$\::::::`............`
`.........`!c$$$$$$$$$$$$$nl!-1B$$$$$$$$$$$$$$$Br_;;;;;;;;;;;;>v$$$$$$$$$$$$$$$$$x::::::,............`
`........."l8$$$$$$$$$$$$$$n<IIW$$$$$$$$$$$$$$$$$$M~;;;;;;;:::W$$$$$$$$$$$$$$$$$$1::,,,,,............`
`.........,l$$$$$$$$$$$$$$$$$v>($$$$$$$$$$$$$$$$$$r;::::::::::)@$$$$$$$$$$$$$$$$c:,,,,,,,............`
`........."I@$$$$$$$$$$$$$$$$$);t$$$$$$$$$$$$$$$z_::::i!+\{:::,I)c@$$$$$$$$$$$$t,,,,,,,,,............`
`.........^;&$$$$$$$$$$$$$$$$$@}:~r&$$$$$$$@&v(i:::::#$$$$$\,,,,,,,>-[}}}[]?_<l,,,,,,,,,"............`
`.........';n$$$$$$$$$$$$$$$$$$$f!:::;;;;;:,,:,,,,,,)$$$$$$$f,,,,,,,,,,,,,,,,"""""""""""^............`
`..........:[$$$$$$$$$$$$$$$$$$$$r,,,,,,,,,,-$8*I,,;@$$$$@$$$u,,,,""""""""""""""""""""""'............`
`..........`:8$$$$$$$$$$$$$$$$$$$?:_(rnr{;,,r$$$%\;}$$$$$}$$$$#:""""""""""""""",!+?<"""^.............`
`...........,[$$$$$$$$$$$$$$$$&[~u$$$$$$$$nI;<l+}({v$$$$f:%$$8/;""",/?<><+[(jz%$$$$$?^^'.............`
`...........',r$$$$$$$$$$$$$$$|{$$$$$$$$$$$@1""j@$$$$$8i"",_;"""""";$$$$$$$$$$$$$$$$;^`..............`
`............`,*$$$$$$$$$$$$$$)n$$$$$$$$$$$$${""-#$$$$i""""^^^^^^^^i$$$$$$$$$$$$$$$/^^...............`
`.............`:M$$$$$$$$$$$$$8$$$$$$$$$$$$$$)"""^[1!:^^^^^^^^^^^^^?$$$$$$$$$$$$$$v^`................`
`..............`,u$$$$$$$$$$$$$*&$$$$$$$$$$$B,^^^^+rc~^^^^,::"^^^^^z$$$$$$$$$$$$$v^`.................`
`...............'"|$$$$$$$$$$$$v"~c$$$$$$$$$@u_;Il>+])fvW$$$$@)+;ln$$$$$$$$$$$$$j^`..................`
`.................^>M$$$$$$$$$$v^^^I{c$$&%$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$%+`'...................`
`..................'^}B$$$$$$$$M}I"^^!$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$t"'.....................`
`....................`"1%$$$$$$$$$$$B@$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$r,`.......................`
`......................'^]*$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$%(,'.........................`
`........................'`:)W$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$@fi`'...........................`
`...........................'`,[u@$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$W|l`'..............................`
`...............................'`;-/*@$$$$$$$$$$$$$$$$$$$$$$8n{!^'..................................`
`...................................'''^:i-{\fxuvvvvuxf|}+I,`'.......................................`
`..............................................'''''.................................................`
`....................................................................................................`
*/

import "@openzeppelin/contracts-4.5/access/Ownable.sol";
import "@openzeppelin/contracts-4.5/utils/Counters.sol";
import "@openzeppelin/contracts-4.5/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts-4.5/token/ERC721/ERC721.sol";

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
