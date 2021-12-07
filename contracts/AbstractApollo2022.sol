// SPDX-License-Identifier: MIT


pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

abstract contract AbstractApollo2022 is ERC1155, ERC1155Supply, Ownable {

    string public name;
    string public symbol;
    uint256 public constant tokenID = 0;
    
    function setURI(string memory newURI) external onlyOwner {
        _setURI(newURI);
        emit URI(newURI, tokenID);
    }

    function totalTicketSupply() public view returns(uint256) {
        return totalSupply(tokenID);
    }

    function ticketBalanceOf(address account) public view returns(uint256){
        return balanceOf(account, tokenID);
    }

    function _mintTickets(address account, uint256 amount) internal {
        _mint(account, tokenID, amount, "");
    }

    function uri(uint256 _id) public view override returns (string memory){
        require(_id == tokenID, "ERC721Metadata: URI query for nonexistent token");
        return super.uri(_id);
    }

    /* ***************************** */

    function _mint(
        address account,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) internal virtual override(ERC1155, ERC1155Supply) {
        super._mint(account, id, amount, data);
    }

    function _mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal virtual override(ERC1155, ERC1155Supply) {
        super._mintBatch(to, ids, amounts, data);
    }

    function _burn(
        address account,
        uint256 id,
        uint256 amount
    ) internal virtual override(ERC1155, ERC1155Supply) {
        super._burn(account, id, amount);
    }

    function _burnBatch(
        address account,
        uint256[] memory ids,
        uint256[] memory amounts
    ) internal virtual override(ERC1155, ERC1155Supply) {
        super._burnBatch(account, ids, amounts);
    } 

}