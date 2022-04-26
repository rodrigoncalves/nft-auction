// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTAuction is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    Counters.Counter private _itemsSold;

    mapping(uint256 => TokenItem) private items;

    struct TokenItem {
        uint256 tokenId;
        address payable seller;
        address payable owner;
        uint256 price; // goal price
        bool sold;
    }

    event TokenItemCreated(
        uint256 indexed tokenId,
        address seller,
        address owner,
        uint256 price,
        bool sold
    );

    constructor() ERC721("NFTAuction", "NFTA") {}

    function createToken(string memory tokenURI, uint256 price)
        public
        payable
        returns (uint256)
    {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _mint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        createMarketItem(newTokenId, price);
        return newTokenId;
    }

    function createMarketItem(uint256 tokenId, uint256 price) private {
        require(price > 0, "Price must be greater than 0");
        TokenItem memory item = TokenItem(
            tokenId,
            payable(msg.sender),
            payable(address(this)),
            price,
            false
        );
        items[tokenId] = item;
        emit TokenItemCreated(tokenId, msg.sender, msg.sender, price, false);
    }

    function getToken(uint256 tokenId)
        public
        view
        returns (TokenItem memory item)
    {
        return items[tokenId];
    }
}
