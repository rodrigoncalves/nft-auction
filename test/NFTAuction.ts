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
  let gamaToken: Contract;

  const NFT01_PRICE = '10';
  const NFT02_PRICE = '20';

  beforeEach(async () => {
    [contractOwner, seller1, seller2, buyer1] = await ethers.getSigners();

    // deploy custom token
    const GamaToken = await ethers.getContractFactory('GamaToken');
    gamaToken = await GamaToken.deploy();
    await gamaToken.deployed();

    // give to buyer some tokens
    let tx = await gamaToken.transfer(buyer1.address, ethers.utils.parseEther('300'));
    tx.wait();

    // just check if the tokens were correctly transferred
    expect(await gamaToken.balanceOf(contractOwner.address)).to.equal(ethers.utils.parseEther('700'));
    expect(await gamaToken.balanceOf(buyer1.address)).to.equal(ethers.utils.parseEther('300'));

    // deploy the nft auction
    const NFTAuction = await ethers.getContractFactory('NFTAuction', {});
    contract = await NFTAuction.deploy(gamaToken.address);
    await contract.deployed();

    // create some tokens
    tx = await contract
      .connect(seller1)
      .createToken('https://www.mytokenlocation.com', ethers.utils.parseEther(NFT01_PRICE));
    await tx.wait();

    tx = await contract
      .connect(seller2)
      .createToken('https://www.mytokenlocation2.com', ethers.utils.parseEther(NFT02_PRICE));
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
    expect(items[0].price).to.eq(ethers.utils.parseEther(NFT01_PRICE));
    expect(items[1].tokenId).to.eq(2);
    expect(items[1].price).to.eq(ethers.utils.parseEther(NFT02_PRICE));
  });

  it('should accept a bid from a buyer', async () => {
    // increase allowance
    await gamaToken.connect(buyer1).increaseAllowance(contract.address, ethers.utils.parseEther('1000'));

    const bid = ethers.utils.parseEther(NFT01_PRICE);
    await contract.connect(buyer1).makeABid(1, { value: bid });

    const highestBidder = await contract.getHighestBidder(1);
    expect(highestBidder).to.eq(buyer1.address);

    const highestBid = await contract.getHighestBid(1);
    expect(highestBid).to.eq(bid);
  });

  it('should reject a bid from a buyer if the bid is lower than the current highest bid', async () => {
    const bid = ethers.utils.parseEther(`${+NFT01_PRICE * 0.8}`);
    await contract.connect(buyer1).makeABid(1, { value: bid });

    const bid2 = ethers.utils.parseEther(`${+NFT01_PRICE * 0.7}`);
    await expect(contract.connect(seller2).makeABid(1, { value: bid2 })).to.be.revertedWith(
      'Bid must be higher than current highest bid'
    );
  });

  it('should reject a bid from a buyer if the bid is higher than the token price', async () => {
    const bidNumber = +NFT01_PRICE * 2;
    const bid = ethers.utils.parseEther(`${bidNumber}`);
    await expect(contract.connect(buyer1).makeABid(1, { value: bid })).to.be.revertedWith(
      'Bid must be less than or equal to the price'
    );
  });

  it('should transfer the token if bid met exactly the price', async () => {
    // increase allowance
    await gamaToken.connect(buyer1).increaseAllowance(contract.address, ethers.utils.parseEther('1000'));

    // make a bid
    const bid = ethers.utils.parseEther(NFT01_PRICE);
    await expect(contract.connect(buyer1).makeABid(1, { value: bid }))
      .to.emit(contract, 'TokenItemSold')
      .withArgs(1, seller1.address, buyer1.address, bid);

    // check that the token is now sold and belongs to the buyer
    const token = await contract.getToken(1);
    expect(token.sold).to.be.true;
    expect(token.owner).to.eq(buyer1.address);
    expect(await contract.ownerOf(1)).to.eq(buyer1.address);

    // check that the item is not available anymore for sale
    const availableItems = await contract.getAvailableItems();
    expect(availableItems.length).to.eq(1);
    expect(availableItems[0].tokenId).to.not.eq(1);

    // check the owner earnings
    const ownerEarnings = await contract.connect(contractOwner).getEarnings();
    expect(ownerEarnings).to.eq(ethers.utils.parseEther(`${+NFT01_PRICE * 0.1}`));

    // check the seller earnings
    const sellerEarnings = await contract.connect(seller1).getEarnings();
    expect(sellerEarnings).to.eq(ethers.utils.parseEther(`${+NFT01_PRICE * 0.9}`));

    // check seller withdrawal earnings (90% of the price)
    const initialBalanceSeller = await gamaToken.balanceOf(seller1.address);
    await contract.connect(seller1).withdrawEarnings();
    const finalBalanceSeller = await gamaToken.balanceOf(seller1.address);
    const diff = finalBalanceSeller.sub(initialBalanceSeller);
    expect(diff).to.eq(ethers.utils.parseEther(`${+NFT01_PRICE * 0.9}`));
    expect(await contract.connect(seller1).getEarnings()).to.eq(0);

    // check contractOwner withdrawal earnings (10% of the price)
    const initialBalanceOwner = await gamaToken.balanceOf(contractOwner.address);
    await contract.connect(contractOwner).withdrawEarnings();
    const finalBalanceOwner = await gamaToken.balanceOf(contractOwner.address);
    const diff2 = finalBalanceOwner.sub(initialBalanceOwner);
    expect(diff2).to.eq(ethers.utils.parseEther(`${+NFT01_PRICE * 0.1}`));
    expect(await contract.connect(contractOwner).getEarnings()).to.eq(0);

    // check that the token has already been sold
    await expect(contract.makeABid(1, { value: bid })).to.be.revertedWith('Token has already been sold');

    // check that does not have any earnings to withdraw
    await expect(contract.connect(contractOwner).withdrawEarnings()).to.be.revertedWith('No earnings to withdraw');
  });
});
