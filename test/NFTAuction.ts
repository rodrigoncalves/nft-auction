import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Contract } from 'ethers';
import { ethers } from 'hardhat';
import { expect } from 'chai';

describe.only('NFTAuction', () => {
  let contract: Contract;
  let contractOwner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async () => {
    // deploy the nft auction
    const NFTAuction = await ethers.getContractFactory('NFTAuction');
    contract = await NFTAuction.deploy();
    await contract.deployed();

    [contractOwner, user1, user2] = await ethers.getSigners();

    // create some tokens
    let tx = await contract.createToken('https://www.mytokenlocation.com', ethers.utils.parseEther('0.1'));
    await tx.wait();

    tx = await contract.createToken('https://www.mytokenlocation2.com', ethers.utils.parseEther('0.5'));
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
    expect(items[1].price).to.eq(ethers.utils.parseEther('0.5'));
  });
});
