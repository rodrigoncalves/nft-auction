import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Contract } from "ethers";
import { ethers } from "hardhat";

describe("MyNFT contract", () => {
  let contract: Contract;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;

  beforeEach(async () => {
    const MyNTF = await ethers.getContractFactory("MyNFT");
    [owner, user1] = await ethers.getSigners();
    contract = await MyNTF.deploy();
  });

  it("should have no tokens after deploy", async () => {
    const tokens = await contract.getAllTokens();
    expect(tokens).to.be.empty;
  });

  it("should mint a token", async () => {
    const tx = await contract.mintToken("NFT01");
    await tx.wait();

    const tokens = await contract.getAllTokens();

    expect(tokens.length).to.equal(1);
    expect(tokens[0].name).to.equal("NFT01");
    expect(tokens[0].tokenId).to.equal(1);
  });

  it("should not see mytokens if other user mint a token", async () => {
    const tx = await contract.connect(user1).mintToken("NFT01");
    await tx.wait();

    const ownerTokens = await contract.getMyTokens();
    expect(ownerTokens.length).to.eq(0);

    const user1Tokens = await contract.connect(user1).getMyTokens();
    expect(user1Tokens.length).to.eq(1);
  });

  it("should not mint token with same name", async () => {
    const tx = await contract.mintToken("NFT01");
    await tx.wait();

    await expect(contract.mintToken("NFT01")).to.be.revertedWith(
      "Token already exists"
    );
  });
});
