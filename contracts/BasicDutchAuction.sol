// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract BasicDutchAuction {
    address payable public seller;
    uint256 public reservePrice;
    uint256 public numBlocksAuctionOpen;
    uint256 public offerPriceDecrement;
    uint256 public initialPrice;
    uint256 public auctionEndTime;
    uint256 public highestBid;
    address public highestBidder;
    bool public auctionEnded;

    constructor(
        uint256 _reservePrice,
        uint256 _numBlocksAuctionOpen,
        uint256 _offerPriceDecrement
    ) {
        seller = payable(msg.sender);
        reservePrice = _reservePrice;
        numBlocksAuctionOpen = _numBlocksAuctionOpen;
        offerPriceDecrement = _offerPriceDecrement;
        initialPrice = reservePrice + numBlocksAuctionOpen * offerPriceDecrement;
        auctionEndTime = block.number + numBlocksAuctionOpen;
        highestBid = 0;
        highestBidder = address(0);
        auctionEnded = false;
    }

    modifier onlySeller() {
        require(msg.sender == seller, "Only the seller can perform this action");
        _;
    }

    modifier onlyBeforeEnd() {
        require(block.number <= auctionEndTime, "Auction has already ended");
        _;
    }

    function placeBid() external payable onlyBeforeEnd {
        require(!auctionEnded, "Auction has already ended");
        require(msg.value > highestBid, "Bid amount is too low");

        if (highestBidder != address(0)) {
            // Refund the previous highest bidder
            payable(highestBidder).transfer(highestBid);
        }

        highestBid = msg.value;
        highestBidder = msg.sender;
    }

    function endAuction() external onlySeller {
        require(block.number >= auctionEndTime, "Auction has not ended yet");
        require(!auctionEnded, "Auction has already ended");

        auctionEnded = true;
        seller.transfer(highestBid);
    }
}
