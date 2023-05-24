const { ethers } = require("hardhat");

describe("BasicDutchAuction", function () {
    let auction;
    let seller;
    let bidder1;
    let bidder2;

    const reservePrice = ethers.utils.parseEther("1");
    const numBlocksAuctionOpen = 10;
    const offerPriceDecrement = ethers.utils.parseEther("0.1");

    beforeEach(async function () {
        const Auction = await ethers.getContractFactory("BasicDutchAuction");
        [seller, bidder1, bidder2] = await ethers.getSigners();

        auction = await Auction.deploy(
            reservePrice,
            numBlocksAuctionOpen,
            offerPriceDecrement
        );

        await auction.deployed();
    });

    it("should initialize with correct parameters", async function () {
        expect(await auction.seller()).to.equal(seller.address);
        expect(await auction.reservePrice()).to.equal(reservePrice);
        expect(await auction.numBlocksAuctionOpen()).to.equal(numBlocksAuctionOpen);
        expect(await auction.offerPriceDecrement()).to.equal(offerPriceDecrement);
        expect(await auction.initialPrice()).to.equal(
            reservePrice.add(numBlocksAuctionOpen.mul(offerPriceDecrement))
        );
        expect(await auction.auctionEndTime()).to.equal(numBlocksAuctionOpen);
        expect(await auction.highestBid()).to.equal(0);
        expect(await auction.highestBidder()).to.equal(ethers.constants.AddressZero);
        expect(await auction.auctionEnded()).to.equal(false);
    });

    it("should allow placing a bid and update highest bidder and bid amount", async function () {
        const bidAmount = ethers.utils.parseEther("1.5");
        await auction.connect(bidder1).placeBid({ value: bidAmount });

        expect(await auction.highestBid()).to.equal(bidAmount);
        expect(await auction.highestBidder()).to.equal(bidder1.address);
    });

    it("should refund the previous highest bidder and update highest bidder on a new higher bid", async function () {
        const bidAmount1 = ethers.utils.parseEther("1.5");
        const bidAmount2 = ethers.utils.parseEther("2.0");

        await auction.connect(bidder1).placeBid({ value: bidAmount1 });
        await auction.connect(bidder2).placeBid({ value: bidAmount2 });

        expect(await auction.highestBid()).to.equal(bidAmount2);
        expect(await auction.highestBidder()).to.equal(bidder2.address);

        // Check if bidder1 got refunded
        const balance1 = await ethers.provider.getBalance(bidder1.address);
        expect(balance1).to.equal(bidAmount1);
    });

    it("should end the auction and transfer the highest bid to the seller", async function () {
        const bidAmount = ethers.utils.parseEther("2.0");

        await auction.connect(bidder1).placeBid({ value: bidAmount });
        await auction.connect(seller).endAuction();

        // Check if the auction has ended
        expect(await auction.auctionEnded()).to.equal(true);

        // Check if the highest bid was transferred to the seller
        const balance = await ethers.provider.getBalance(seller.address);
        expect(balance).to.equal(bidAmount);
    });

    it("should not allow placing bids after the auction has ended", async function () {
        const bidAmount = ethers.utils.parseEther("1.5");

        await auction.connect(seller).endAuction();

        await expect(
            auction.connect(bidder1).placeBid({ value: bidAmount })
        ).to.be.revertedWith("Auction has already ended");
    });

    it("should not allow ending the auction before the auction end time", async function () {
        await expect(auction.connect(seller).endAuction()).to.be.revertedWith(
            "Auction has not ended yet"
        );
    });
});
