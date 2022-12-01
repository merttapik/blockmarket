import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import {Contract} from "ethers";

/*const mapping={} as any;
mapping['tokenID']={price:123,seller:'seller'}
mapping['tokenID1']={price:1,seller:'seller'}
mapping['tokenID2']={price:23,seller:'seller'}*/

describe("NFTMarket", () => {
  let nftMarket: Contract;
  let signers: SignerWithAddress[];

  before(async () => {
    // Deploy the NFTMarket contract
    const NFTMarket = await ethers.getContractFactory("NFTMarket");
    nftMarket = await NFTMarket.deploy();
    await nftMarket.deployed();
    signers = await ethers.getSigners();
    
  });
  const createNFT = async (tokenURI: string) => {
    const transaction = await nftMarket.createNFT(tokenURI);
    const receipt = await transaction.wait();
    const tokenID = receipt.events[0].args.tokenId;
    return tokenID;
  };
  const createAndListNFT = async (price: number) => {
    const tokenID = await createNFT("some token uri");
    const transaction = await nftMarket.listNFT(tokenID, price);
    await transaction.wait();
    return tokenID;
  };

  describe("createNFT", () => {
    //test
    it("should create an NFT with the correct owner and tokenURI", async () => {
      //deploy the nftmarket contract
      const NFTMarket = await ethers.getContractFactory('NFTMarket');
      const nftMarket = await NFTMarket.deploy();
      await nftMarket.deployed();
  
      // call the create nft function
      const tokenURI = 'https://some-token.uri/';
   
  
      const transaction = await nftMarket.createNFT(tokenURI);
      const receipt = await transaction.wait();
      const tokenID = receipt.events[0].args.tokenId;
      const mintedTokenURI = await nftMarket.tokenURI(tokenID);
      expect(mintedTokenURI).to.equal(tokenURI);
  
      // assert thath the owner ıf the newly created NFT is the address that started the transaction
      const ownerAddress = await nftMarket.ownerOf(tokenID);
      const signers = await ethers.getSigners();
      const currentAddress = await signers[0].getAddress();
      expect(ownerAddress).to.equal(currentAddress);
       // Assert that NFTTransfer event has the correct args
       const args = receipt.events[1].args;
      expect(args.tokenID).to.equal(tokenID);
      expect(args.from).to.equal(ethers.constants.AddressZero);
      expect(args.to).to.equal(ownerAddress);
      expect(args.tokenURI).to.equal(tokenURI);
      expect(args.price).to.equal(0);
       
  
    });
  });
  describe("listNFT", () => {
    const tokenURI = "some token uri";
    it("should revert if price is zero", async () => {
      const tokenID = await createNFT(tokenURI);
      const transaction = nftMarket.listNFT(tokenID, 0);
      await expect(transaction).to.be.revertedWith(  "NFTMarket: price must be greater than 0");
    });
    it("should revert if not called by the owner", async () => {
      const tokenID = await createNFT(tokenURI);
      const transaction = nftMarket.connect(signers[1]).listNFT(tokenID, 12);
      await expect(transaction).to.be.revertedWith(
        "ERC721: approve caller is not token owner or approved for all"
      );
    });
    it("should list the token for sale if all requirements are met", async () => {
      const price = 123;
      const tokenID = await createNFT(tokenURI);
      const transaction = await nftMarket.listNFT(tokenID, price);
      const receipt = await transaction.wait();
      const ownerAddress = await nftMarket.ownerOf(tokenID);
      expect(ownerAddress).to.equal(nftMarket.address);
      const args = receipt.events[2].args;
      expect(args.tokenID).to.equal(tokenID);
      expect(args.from).to.equal(signers[0].address);
      expect(args.to).to.equal(nftMarket.address);
      expect(args.tokenURI).to.equal("");
      expect(args.price).to.equal(price);
      
      
    
    });

  });

  describe("buyNFT", () => {
    it("should revert if NFT is not listed for sale", async () => {
      const transaction = nftMarket.buyNFT(9999);
      await expect(transaction).to.be.revertedWith(
        "NFTMarket: nft not listed for sale"
      );
    });
    it("should revert if the amount of wei sent is not equal to the NFT price", async () => {
      const tokenID = await createAndListNFT(123);
      const transaction = nftMarket.buyNFT(tokenID, { value: 124 });
      await expect(transaction).to.be.revertedWith(
        "NFTMarket: incorrect price"
      );
    });
    it("should transfer ownership to the buyer and send the price to the seller", async () => {
      const price = 123;
      const sellerProfit = Math.floor((price * 95) / 100);
      const fee = price - sellerProfit;
      const initialContractBalance = await nftMarket.provider.getBalance(
        nftMarket.address
      );
      const tokenID = await createAndListNFT(price);
      await new Promise((r) => setTimeout(r, 100));
      const oldSellerBalance = await signers[0].getBalance();
      const transaction = await nftMarket
        .connect(signers[1])
        .buyNFT(tokenID, { value: price });
      const receipt = await transaction.wait();
      
      await new Promise((r) => setTimeout(r, 100));
      const newSellerBalance = await signers[0].getBalance();
      const diff = newSellerBalance.sub(oldSellerBalance);
      expect(diff).to.equal(sellerProfit);
      const newContractBalance = await nftMarket.provider.getBalance(
        nftMarket.address
      );
      const contractBalanceDiff = newContractBalance.sub(
        initialContractBalance
      );
      expect(contractBalanceDiff).to.equal(fee);

      const ownerAddress = await nftMarket.ownerOf(tokenID);
      expect(ownerAddress).to.equal(signers[1].address);
      const args = receipt.events[2].args;
      expect(args.tokenID).to.equal(tokenID);
      expect(args.from).to.equal(nftMarket.address);
      expect(args.to).to.equal(signers[1].address);
      expect(args.tokenURI).to.equal("");
      expect(args.price).to.equal(0);
      
      
    });

  });
  
  describe("cancelListing", () => {
    it("should revert if the NFT is not listed for sale", async () => {
      const transaction = nftMarket.cancelListing(9999);
      await expect(transaction).to.be.revertedWith(
        "NFTMarket: nft not listed for sale"
      );
    });
    it("should revert if the caller is not the seller of the listing", async () => {
      const tokenID = await createAndListNFT(123);
      const transaction = nftMarket.connect(signers[1]).cancelListing(tokenID);
      await expect(transaction).to.be.revertedWith(
        "NFTMarket: you're not the seller"
      );
      
    });
    it("should transfer the ownership back to the seller if all requirements are met", async () => {
      const tokenID = await createAndListNFT(123);
      const transaction = await nftMarket.cancelListing(tokenID);
      const receipt = await transaction.wait();
      // Check ownership
      const ownerAddress = await nftMarket.ownerOf(tokenID);
      expect(ownerAddress).to.equal(signers[0].address);
      // Check NFTTransfer event
      const args = receipt.events[2].args;
      expect(args.tokenID).to.equal(tokenID);
      expect(args.from).to.equal(nftMarket.address);
      expect(args.to).to.equal(signers[0].address);
      expect(args.tokenURI).to.equal("");
      expect(args.price).to.equal(0);
      
    });
  });

  describe("withdrawFunds", () => {
    it("should revert if called by a signer other than the owner", async () => {
      const transaction = nftMarket.connect(signers[1]).withdrawFunds();
      await expect(transaction).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
    it("should transfer all funds from the contract balance to the owner's",async () => {
      const contractBalance=await nftMarket.provider.getBalance(nftMarket.address);
      //console.log("BALANCE:", contractBalance);
      const initialOwnerBalance = await signers[0].getBalance();
      const transaction = await nftMarket.withdrawFunds();
      const receipt = await transaction.wait();

      await new Promise((r) => setTimeout(r, 100));
      const newOwnerBalance = await signers[0].getBalance();
     
      const gas = receipt.gasUsed.mul(receipt.effectiveGasPrice);
      const transferred = newOwnerBalance.add(gas).sub(initialOwnerBalance);
      expect(transferred).to.equal(contractBalance);  
    });
    it("should revert if contract balance is zero", async () => {
      const transaction = nftMarket.withdrawFunds();
      await expect(transaction).to.be.revertedWith(
        "NFTMarket: balance is zero"
      );
    });

    

    
  });
  


  
});

  























































// describe("Lock", function () {
//   // We define a fixture to reuse the same setup in every test.
//   // We use loadFixture to run this setup once, snapshot that state,
//   // and reset Hardhat Network to that snapshot in every test.
//   async function deployOneYearLockFixture() {
//     const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
//     const ONE_GWEI = 1_000_000_000;

//     const lockedAmount = ONE_GWEI;
//     const unlockTime = (await time.latest()) + ONE_YEAR_IN_SECS;

//     // Contracts are deployed using the first signer/account by default
//     const [owner, otherAccount] = await ethers.getSigners();

//     const Lock = await ethers.getContractFactory("Lock");
//     const lock = await Lock.deploy(unlockTime, { value: lockedAmount });

//     return { lock, unlockTime, lockedAmount, owner, otherAccount };
//   }

//   describe("Deployment", function () {
//     it("Should set the right unlockTime", async function () {
//       const { lock, unlockTime } = await loadFixture(deployOneYearLockFixture);

//       expect(await lock.unlockTime()).to.equal(unlockTime);
//     });

//     it("Should set the right owner", async function () {
//       const { lock, owner } = await loadFixture(deployOneYearLockFixture);

//       expect(await lock.owner()).to.equal(owner.address);
//     });

//     it("Should receive and store the funds to lock", async function () {
//       const { lock, lockedAmount } = await loadFixture(
//         deployOneYearLockFixture
//       );

//       expect(await ethers.provider.getBalance(lock.address)).to.equal(
//         lockedAmount
//       );
//     });

//     it("Should fail if the unlockTime is not in the future", async function () {
//       // We don't use the fixture here because we want a different deployment
//       const latestTime = await time.latest();
//       const Lock = await ethers.getContractFactory("Lock");
//       await expect(Lock.deploy(latestTime, { value: 1 })).to.be.revertedWith(
//         "Unlock time should be in the future"
//       );
//     });
//   });

//   describe("Withdrawals", function () {
//     describe("Validations", function () {
//       it("Should revert with the right error if called too soon", async function () {
//         const { lock } = await loadFixture(deployOneYearLockFixture);

//         await expect(lock.withdraw()).to.be.revertedWith(
//           "You can't withdraw yet"
//         );
//       });

//       it("Should revert with the right error if called from another account", async function () {
//         const { lock, unlockTime, otherAccount } = await loadFixture(
//           deployOneYearLockFixture
//         );

//         // We can increase the time in Hardhat Network
//         await time.increaseTo(unlockTime);

//         // We use lock.connect() to send a transaction from another account
//         await expect(lock.connect(otherAccount).withdraw()).to.be.revertedWith(
//           "You aren't the owner"
//         );
//       });

//       it("Shouldn't fail if the unlockTime has arrived and the owner calls it", async function () {
//         const { lock, unlockTime } = await loadFixture(
//           deployOneYearLockFixture
//         );

//         // Transactions are sent using the first signer by default
//         await time.increaseTo(unlockTime);

//         await expect(lock.withdraw()).not.to.be.reverted;
//       });
//     });

//     describe("Events", function () {
//       it("Should emit an event on withdrawals", async function () {
//         const { lock, unlockTime, lockedAmount } = await loadFixture(
//           deployOneYearLockFixture
//         );

//         await time.increaseTo(unlockTime);

//         await expect(lock.withdraw())
//           .to.emit(lock, "Withdrawal")
//           .withArgs(lockedAmount, anyValue); // We accept any value as `when` arg
//       });
//     });

//     describe("Transfers", function () {
//       it("Should transfer the funds to the owner", async function () {
//         const { lock, unlockTime, lockedAmount, owner } = await loadFixture(
//           deployOneYearLockFixture
//         );

//         await time.increaseTo(unlockTime);

//         await expect(lock.withdraw()).to.changeEtherBalances(
//           [owner, lock],
//           [lockedAmount, -lockedAmount]
//         );
//       });
//     });
//   });
// });
