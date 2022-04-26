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
    mapping(uint256 => uint256) private highestBid;
    mapping(uint256 => address) private highestBidder;

    uint256 private ownerEarnings;

    struct TokenItem {
        uint256 tokenId;
        address payable seller;
        address payable owner;
        uint256 price; // goal price
        bool sold;
    }

    event TokenItemCreated(uint256 indexed tokenId, address seller, address owner, uint256 price, bool sold);

    constructor() ERC721("NFTAuction", "NFTA") {}

    function getToken(uint256 tokenId) public view returns (TokenItem memory item) {
        return items[tokenId];
    }

    function getHighestBidder(uint256 tokenId) public view returns (address) {
        return highestBidder[tokenId];
    }

    function getHighestBid(uint256 tokenId) public view returns (uint256) {
        return highestBid[tokenId];
    }

    function getOwnerEarnings() public view onlyOwner returns (uint256) {
        return ownerEarnings;
    }

    function createToken(string memory tokenURI, uint256 price) public payable returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _mint(address(this), newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        createMarketItem(newTokenId, price);
        return newTokenId;
    }

    function createMarketItem(uint256 tokenId, uint256 price) private {
        require(price > 0, "Price must be greater than 0");
        TokenItem memory item = TokenItem(tokenId, payable(msg.sender), payable(address(this)), price, false);
        items[tokenId] = item;
        emit TokenItemCreated(tokenId, msg.sender, msg.sender, price, false);
    }

    // returns all unsold market items
    function getAvailableItems() public view returns (TokenItem[] memory) {
        uint256 itemCount = _tokenIds.current();
        uint256 unsoldItemCount = _tokenIds.current() - _itemsSold.current();
        uint256 currentIndex = 0;

        TokenItem[] memory unsoldItems = new TokenItem[](unsoldItemCount);
        for (uint256 i = 0; i < itemCount; i++) {
            if (items[i + 1].owner == address(this)) {
                uint256 currentId = i + 1;
                TokenItem storage currentItem = items[currentId];
                unsoldItems[currentIndex] = currentItem;
                currentIndex++;
            }
        }
        return unsoldItems;
    }

    function makeABid(uint256 tokenId) public payable {
        require(highestBid[tokenId] < msg.value, "Bid must be higher than current highest bid");
        require(items[tokenId].sold == false, "Item has already been sold");
        require(items[tokenId].price >= msg.value, "Bid must be less than or equal to the price");

        highestBid[tokenId] = msg.value;
        highestBidder[tokenId] = msg.sender;

        // transfer the token
        if (items[tokenId].price == msg.value) {
            createSale(tokenId, msg.value);
        }
    }

    function createSale(uint256 tokenId, uint256 bid) private {
        address seller = items[tokenId].seller;
        address buyer = address(msg.sender);

        items[tokenId].sold = true;
        items[tokenId].owner = payable(buyer);
        items[tokenId].seller = payable(address(0));
        _itemsSold.increment();

        _transfer(address(this), buyer, tokenId);

        uint256 fee = bid / 10;
        ownerEarnings += fee;
        payable(seller).transfer(bid - fee);
    }
}
