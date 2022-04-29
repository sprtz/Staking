import { ethers, network } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { SPR20 } from "../typechain";


describe("SPR20", function() {

  let contract: SPR20;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let clean: any;

  const zeroAddress = "0x0000000000000000000000000000000000000000";
  const revertValue = 100000;
  const initValue = 1;

  before(async () => {
    const Contract = await ethers.getContractFactory("SPR20");
    contract = await Contract.deploy();
    [owner, addr1] = await ethers.getSigners();
    await contract.deployed();

    clean = await network.provider.send("evm_snapshot");
  });


  afterEach(async () => {
    await network.provider.send("evm_revert", [clean]);
    clean = await network.provider.send("evm_snapshot");
  });


  describe("function name", () => {

    it("Should return name", async () => {
      const name = await contract.name();
      expect(name).to.be.equal("Spritzen");
    });
  });


  describe("function symbol", () => {

    it("Should return symbol", async () => {
      const symbol = await contract.symbol();
      expect(symbol).to.be.equal("SPR");
    });
  });


  describe("function decimals", () => {

    it("Should return decimals", async () => {
      const decimals = await contract.decimals();
      expect(decimals).to.be.equal(18);
    });
  });


  describe("function totalSupply", () => {

    it("Should return totalSupply", async () => {
      const totalSupply = await contract.totalSupply();
      expect(totalSupply).to.be.equal(1000000000);
    });
  });


  describe("function balanceOf", () => {

    it("Should revert if address is zero", async () => {
      const promise = contract.balanceOf(zeroAddress);
      await expect(promise).to.be.revertedWith("Zero address are not allowed");
    });

    it("Should return balance of address", async () => {
      await contract.mint(owner.address, initValue);
      const balance = await contract.balanceOf(owner.address);
      expect(balance).to.be.equal(initValue);
    });
  });


  describe("function transfer", () => {

    it("Should revert if address to transfer is zero", async () => {
      const promise = contract.connect(addr1).transfer(zeroAddress, initValue);
      await expect(promise).to.be.revertedWith("Zero address are not allowed");
    });

    it("Should throw error if the owner balance doesn't have enough tokens", async () => {
      const promise = contract.connect(addr1).transfer(owner.address, revertValue);
      await expect(promise).to.be.revertedWith("Not enough tokens");
    });

    it("Should increase balance", async () => {
      await contract.mint(owner.address, initValue);
      await contract.connect(owner).transfer(addr1.address, initValue);
      const balance = await contract.balanceOf(addr1.address);
      expect(balance).to.be.equal(initValue);
    });

    it("Should decrease balance", async () => {
      await contract.mint(owner.address, initValue);
      const startBalance = await contract.balanceOf(owner.address);
      await contract.connect(owner).transfer(addr1.address, initValue);
      const endBalance = await contract.balanceOf(owner.address);
      expect(startBalance).to.be.eq(endBalance.add(initValue));
    });

    it("Should send event", async () => {
      await contract.mint(owner.address, initValue);
      const promise = contract.connect(owner).transfer(addr1.address, initValue);
      await expect(promise).to.be.emit(contract, "Transfer");
    });
  });


  describe("function transferFrom", () => {

    it("Should revert if _from address to transfer is zero", async () => {
      const promise = contract.connect(addr1).transferFrom(zeroAddress, addr1.address, initValue);
      await expect(promise).to.be.revertedWith("Zero address are not allowed");
    });

    it("Should revert if _to address to transfer is zero", async () => {
      const promise = contract.connect(addr1).transferFrom(owner.address, zeroAddress, initValue);
      await expect(promise).to.be.revertedWith("Zero address are not allowed");
    });

    it("Should revert if the _from address doesn't allowed enough tokens", async () => {
      await contract.mint(owner.address, initValue);
      await contract.approve(owner.address, initValue);
      const promise = contract.connect(addr1).transferFrom(owner.address, addr1.address, revertValue);
      await expect(promise).to.be.revertedWith("Allowed limit exceeded");
    });

    it("Should revert if user exceeded the balance", async () => {
      await contract.mint(owner.address, revertValue);
      await contract.approve(addr1.address, revertValue);
      await contract.burn(owner.address, revertValue);
      const promise = contract.connect(addr1).transferFrom(owner.address, addr1.address, revertValue);
      await expect(promise).to.be.revertedWith("Not enough tokens");
    });

    it("Should increase balance", async () => {
      await contract.mint(owner.address, initValue);
      await contract.connect(owner).approve(addr1.address, initValue);
      await contract.connect(addr1).transferFrom(owner.address, addr1.address, initValue);
      const balance = await contract.balanceOf(addr1.address);
      expect(balance).to.be.equal(initValue);
    });

    it("Should decrease balance", async () => {
      await contract.mint(owner.address, initValue);
      const startBalance = await contract.balanceOf(owner.address);
      await contract.connect(owner).approve(addr1.address, initValue);
      await contract.connect(addr1).transferFrom(owner.address, addr1.address, initValue);
      const endBalance = await contract.balanceOf(owner.address);
      expect(startBalance).to.be.eq(endBalance.add(initValue));
    });

    it("Should decrease allowed amount", async () => {
      const difference = initValue - 1;
      await contract.mint(owner.address, initValue);
      await contract.connect(owner).approve(addr1.address, initValue);
      await contract.connect(addr1).transferFrom(owner.address, addr1.address, difference);
      const allowance = await contract.allowance(owner.address, addr1.address);
      expect(allowance).to.be.equal(initValue - difference);
    });

    it("Should emit event", async () => {
      await contract.mint(owner.address, initValue);
      await contract.approve(addr1.address, initValue);
      const promise = contract.connect(addr1).transferFrom(owner.address, addr1.address, initValue);
      await expect(promise).to.be.emit(contract, "Transfer");
    });
  });


  describe("function approve", () => {

    it("Should revert if _spender address to transfer is zero", async () => {
      const promise = contract.approve(zeroAddress, initValue);
      await expect(promise).to.be.revertedWith("Zero address are not allowed");
    });

    it("Should revert if user exceeded the balance", async () => {
        await contract.mint(addr1.address, initValue);
        const promise = contract.approve(addr1.address, revertValue);
        await expect(promise).to.be.revertedWith("Not enough tokens");
    });

    it("Should increase allowed amount", async () => {
      await contract.mint(owner.address, initValue);
      await contract.approve(addr1.address, initValue);
      const allowance = await contract.allowance(owner.address, addr1.address);
      expect(allowance).to.be.equal(initValue);
    });

    it("Should emit event", async () => {
      await contract.mint(owner.address, initValue);
      const promise = contract.approve(addr1.address, initValue);
      await expect(promise).to.be.emit(contract, "Approval");
    });
  });


  describe("function allowance", () => {

    it("Should revert if _ owner address to transfer is zero", async () => {
        const promise = contract.allowance(zeroAddress, addr1.address);
        await expect(promise).to.be.revertedWith("Zero address are not allowed");
    });

    it("Should revert if _spender address to transfer is zero", async () => {
        const promise = contract.allowance(owner.address, zeroAddress);
        await expect(promise).to.be.revertedWith("Zero address are not allowed");
    });

    it("Should increase allowed amount", async () => {
      await contract.mint(owner.address, initValue);
      await contract.approve(addr1.address, initValue);
      const allowance = await contract.allowance(owner.address, addr1.address);
      expect(allowance).to.be.equal(initValue);
    });

    it("Should decrease allowed amount", async () => {
      const difference = initValue - 1;
      await contract.mint(owner.address, initValue);
      await contract.connect(owner).approve(addr1.address, initValue);
      await contract.connect(addr1).transferFrom(owner.address, addr1.address, difference);
      const allowance = await contract.allowance(owner.address, addr1.address);
      expect(allowance).to.be.equal(initValue - difference);
    });
  });


  describe("function burn", () => {

    it("Only owner can do this", async () => {
      const promise = contract.mint(addr1.address, initValue);
      await expect(promise).to.not.be.revertedWith("Only owner can do this");
    });

    it("Should revert if not owner", async () => {
      await contract.mint(addr1.address, initValue);
      const promise = contract.burn(addr1.address, initValue);
      await expect(promise).to.not.be.revertedWith("Only owner can do this");
    });

    it("Should revert if address to transfer is zero", async () => {
      const promise = contract.burn(zeroAddress, initValue);
      await expect(promise).to.be.revertedWith("Zero address are not allowed");
    });

    it("Should revert if user exceeded the balance", async () => {
      await contract.mint(addr1.address, initValue);
      const promise = contract.burn(addr1.address, revertValue);
      await expect(promise).to.be.revertedWith("Not enough tokens");
    });

    it("Should decrease address balance", async () => {
      await contract.mint(addr1.address, initValue);
      const startBalance = await contract.balanceOf(addr1.address);
      await contract.burn(addr1.address, initValue);
      const endBalance = await contract.balanceOf(addr1.address);

      expect(startBalance).to.be.equal(endBalance.add(initValue));
    });

    it("Should decrease totalSupply", async () => {
      await contract.mint(addr1.address, initValue);
      const startTotalSupply = await contract.totalSupply();
      await contract.burn(addr1.address, initValue);
      const endTotalSupply = await contract.totalSupply();

      expect(startTotalSupply).to.be.equal(endTotalSupply.add(initValue));
    });

    it("Should emit event", async () => {
      await contract.mint(addr1.address, initValue);
      const promise = contract.burn(addr1.address, initValue);
      await expect(promise).to.be.emit(contract, "Transfer");
    });
  });


  describe("function mint", () => {

    it("Only owner can do this", async () => {
      const promise = contract.mint(addr1.address, initValue);
      await expect(promise).to.not.be.revertedWith("Only owner can do this");
    });
    
    it("Should revert if not owner", async () => {
      const promise = contract.connect(addr1).mint(addr1.address, initValue);
      await expect(promise).to.be.revertedWith("Only owner can do this");
    });

    it("Should revert if address to transfer is zero", async () => {
      const promise = contract.mint(zeroAddress, initValue);
      await expect(promise).to.be.revertedWith("Zero address are not allowed");
    });

    it("Should increase address balance", async () => {
      const startBalance = await contract.balanceOf(addr1.address);
      await contract.mint(addr1.address, initValue);
      const endBalance = await contract.balanceOf(addr1.address);

      expect(startBalance).to.be.eq(endBalance.sub(initValue));
    });

    it("Should increase totalSupply", async () => {
      const startTotalSupply = await contract.totalSupply();
      await contract.mint(addr1.address, initValue);
      const endTotalSupply = await contract.totalSupply();

      expect(startTotalSupply).to.be.eq(endTotalSupply.sub(initValue));
    });

    it("Should send event", async () => {
      const promise = contract.mint(addr1.address, initValue);
      await expect(promise).to.be.emit(contract, "Transfer");
    });
  });
});