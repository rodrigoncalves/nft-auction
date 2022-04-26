// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MyNFT is ERC721 {
    address public owner;
    uint256 tokenId = 0;

    struct TokenInfo {
        uint256 tokenId;
        string name;
        address owner;
    }

    TokenInfo[] public tokens;
    mapping(address => TokenInfo[]) public tokenAddress;
    mapping(string => bool) public tokenExists;
    mapping(uint256 => address) public tokenIdToAddress;
    mapping(uint256 => TokenInfo) public tokenIdToName;

    constructor() ERC721("MyNFT", "MNFT") {
        owner = msg.sender;
    }

    function getAllTokens() public view returns (TokenInfo[] memory) {
        return tokens;
    }

    function getMyTokens() public view returns (TokenInfo[] memory) {
        return tokenAddress[msg.sender];
    }

    function mintToken(string calldata _tokenName)
        external
        payable
        returns (uint256)
    {
        require(!tokenExists[_tokenName], "Token already exists");

        _safeMint(msg.sender, ++tokenId);

        TokenInfo memory token = TokenInfo(tokenId, _tokenName, msg.sender);
        tokens.push(token);
        tokenAddress[msg.sender].push(token);
        tokenExists[_tokenName] = true;
        return tokenId;
    }
}
