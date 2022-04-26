import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";
import { ethers } from "hardhat";
import { expect } from "chai";

describe.only("NFTAuction", () => {
  let contract: Contract;
  let contractOwner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async () => {
    // deploy the nft auction
    const NFTAuction = await ethers.getContractFactory("NFTAuction");
    contract = await NFTAuction.deploy();
    await contract.deployed();

    [contractOwner, user1, user2] = await ethers.getSigners();
  });

  it("should accept an NFT with its price point from the asset owner", async () => {
    // create a token
    const tokenURI = "https://www.mytokenlocation.com";
    const tokenPrice = ethers.utils.parseEther("5");
    const tx = await contract.createToken(tokenURI, tokenPrice);
    await tx.wait();

    // get the token by id
    const token = await contract.getToken(1);
    expect(token.tokenId).to.eq(1);
    expect(token.sold).to.be.false;
  });
});
