import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Contract } from 'ethers';
import { ethers } from 'hardhat';
import { expect } from 'chai';

describe.only('NFTAuction', () => {
  let contract: Contract;
  let contractOwner: SignerWithAddress;
  let seller1: SignerWithAddress;
  let seller2: SignerWithAddress;
  let buyer1: SignerWithAddress;

  beforeEach(async () => {
    // deploy the nft auction
    const NFTAuction = await ethers.getContractFactory('NFTAuction');
    contract = await NFTAuction.deploy();
    await contract.deployed();

    [contractOwner, seller1, seller2, buyer1] = await ethers.getSigners();

    // create some tokens
    let tx = await contract
      .connect(seller1)
      .createToken('https://www.mytokenlocation.com', ethers.utils.parseEther('0.1'));
    await tx.wait();

    tx = await contract
      .connect(seller2)
      .createToken('https://www.mytokenlocation2.com', ethers.utils.parseEther('0.2'));
    await tx.wait();
  });

  it('should accept an NFT with its price point from the asset owner', async () => {
    // get the token by id
    const token = await contract.getToken(1);
    expect(token.tokenId).to.eq(1);
    expect(token.sold).to.be.false;
  });

  it('should list the available assets with its price', async () => {
    const items = await contract.getAvailableItems();

    expect(items.length).to.eq(2);
    expect(items[0].tokenId).to.eq(1);
    expect(items[0].price).to.eq(ethers.utils.parseEther('0.1'));
    expect(items[1].tokenId).to.eq(2);
    expect(items[1].price).to.eq(ethers.utils.parseEther('0.2'));
  });

  it('should accept a bid from a buyer', async () => {
    const bid = ethers.utils.parseEther('0.08');
    await contract.connect(buyer1).makeABid(1, { value: bid });

    const highestBidder = await contract.getHighestBidder(1);
    expect(highestBidder).to.eq(buyer1.address);

    const highestBid = await contract.getHighestBid(1);
    expect(highestBid).to.eq(bid);
  });

  it('should reject a bid from a buyer if the bid is lower than the current highest bid', async () => {
    const bid = ethers.utils.parseEther('0.08');
    await contract.connect(buyer1).makeABid(1, { value: bid });

    const bid2 = ethers.utils.parseEther('0.07');
    await expect(contract.connect(seller2).makeABid(1, { value: bid2 })).to.be.revertedWith(
      'Bid must be higher than current highest bid'
    );
  });

  it('should reject a bid from a buyer if the bid is higher than the token price', async () => {
    const bid = ethers.utils.parseEther('1');
    await expect(contract.connect(buyer1).makeABid(1, { value: bid })).to.be.revertedWith(
      'Bid must be less than or equal to the price'
    );
  });

  it.only('should transfer the token if bid met exactly the price', async () => {
    const initialBalanceSeller1 = await seller1.getBalance();

    // make a bid
    const bid = ethers.utils.parseEther('0.1');
    await contract.connect(buyer1).makeABid(1, { value: bid });

    // check that the token is now sold and belongs to the buyer
    const token = await contract.getToken(1);
    expect(token.sold).to.be.true;
    expect(token.owner).to.eq(buyer1.address);

    // check that the item is not available anymore for sale
    const availableItems = await contract.getAvailableItems();
    expect(availableItems.length).to.eq(1);

    // check the owner earnings
    const ownerEarnings = await contract.connect(contractOwner).getOwnerEarnings();
    expect(ownerEarnings).to.eq(ethers.utils.parseEther('0.01'));

    // check that the seller received the amount minus contract owner fee
    const finalBalanceSeller1 = await seller1.getBalance();
    expect(finalBalanceSeller1.sub(initialBalanceSeller1)).to.eq(ethers.utils.parseEther('0.09'));

    // non-owner user cannot check the owner earnings
    await expect(contract.connect(seller1).getOwnerEarnings()).to.be.revertedWith('Ownable: caller is not the owner');
  });
});
