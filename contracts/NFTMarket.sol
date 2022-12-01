// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
struct NFTListing {
  uint256 price;
  address seller;
}
contract NFTMarket is ERC721URIStorage,Ownable {
    using Counters for Counters.Counter;
     using SafeMath for uint256;
    Counters.Counter private _tokenIds;
    mapping(uint256 => NFTListing) private _listings;
     event NFTTransfer(uint256 tokenID, address from, address to, string tokenURI, uint256 price);

    constructor() ERC721("Omer's NFTs", "ANFT") {}

    
    function createNFT(string calldata tokenURI) public  {
        _tokenIds.increment();
        uint256 currentID = _tokenIds.current();
        _safeMint(msg.sender, currentID);
        _setTokenURI(currentID, tokenURI);
         emit NFTTransfer(currentID,address(0),msg.sender, tokenURI, 0);

    }
    //List nft
    function listNFT(uint256 tokenID, uint256 price) public {
    require(price > 0, "NFTMarket: price must be greater than 0");
    approve(address(this), tokenID);
    transferFrom(msg.sender, address(this), tokenID);
    _listings[tokenID] = NFTListing(price, msg.sender);
     emit NFTTransfer(tokenID, msg.sender,  address(this), "", price);
  }
  //buy nft
  function buyNFT(uint256 tokenID) public payable {
     NFTListing memory listing = _listings[tokenID];
     require(listing.price > 0, "NFTMarket: nft not listed for sale");
     require(msg.value == listing.price, "NFTMarket: incorrect price");
     
     ERC721(address(this)).transferFrom(address(this), msg.sender, tokenID);
     approve(address(this), tokenID);
     clearListing(tokenID);
     payable(listing.seller).transfer(listing.price.mul(95).div(100));
     emit NFTTransfer(tokenID,address(this), msg.sender, "", 0);
  }
  //cancel listing
    function cancelListing(uint256 tokenID) public {
     NFTListing memory listing = _listings[tokenID];
     require(listing.price > 0, "NFTMarket: nft not listed for sale");
     require(listing.seller == msg.sender, "NFTMarket: you're not the seller");
     ERC721(address(this)).transferFrom(address(this), msg.sender, tokenID);
     approve(address(this), tokenID);
     clearListing(tokenID);
     emit NFTTransfer(tokenID, address(this), msg.sender, "", 0);
  }
  //clear listing
  function clearListing(uint256 tokenID) private {
    _listings[tokenID].price = 0;
    _listings[tokenID].seller= address(0);
  }
  //withdraw
  function withdrawFunds() public onlyOwner {
    uint256 balance =  address(this).balance;
    require(balance > 0, "NFTMarket: balance is zero");
    payable(owner()).transfer(balance); 
  }
}
