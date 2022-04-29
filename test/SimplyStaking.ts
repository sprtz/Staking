import { expect } from "chai";
import { ethers, network } from "hardhat";
import { BigNumber } from "@ethersproject/bignumber";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { SPR20, SimplyStaking, IUniswapV2Pair, IUniswapV2Factory, IUniswapV2Router02 } from "../typechain";



describe("SimplyStaking", function () {

  let owner: SignerWithAddress;
  let staker: SignerWithAddress;
  let spender: SignerWithAddress;

  let token: SPR20;
  let anotherStake: SimplyStaking;

  let pair: IUniswapV2Pair;
  let clean: any;
  
  let lpTokensAmount: BigNumber;

  beforeEach(async () => {

      [owner, staker, spender] = await ethers.getSigners();
  
      const tokenFactory = await ethers.getContractFactory("SPR20");
      token = <SPR20>(await tokenFactory.deploy());
      await token.deployed();

    
      const router = <IUniswapV2Router02>(await ethers.getContractAt("IUniswapV2Router02", process.env.ROUTER_ADDRESS as string));
      const factory = <IUniswapV2Factory>(await ethers.getContractAt("IUniswapV2Factory", process.env.FACTORY_ADDRESS as string));


      const anotherTokensAmount = ethers.BigNumber.from(1000000);
      const etherTokensAmount = ethers.utils.parseEther("1");
      const minLiquidity = ethers.BigNumber.from(1000);
      const squareRoot = BigNumber.from(Math.sqrt(Number(anotherTokensAmount.mul(etherTokensAmount))));
      lpTokensAmount = squareRoot.sub(minLiquidity);


      await token.mint(staker.address, 100000);
      await token.connect(staker).approve(router.address, 100000);
    
      const currentDate = new Date();
      const deadline = currentDate.getTime() + 100
      
      await router.connect(staker).addLiquidityETH(
          token.address,
          10000, 
          0,
          etherTokensAmount,
          staker.address,
          deadline,
        { value: etherTokensAmount });
      


      const pairAddress = await factory.getPair(token.address, process.env.WETH_ADDRESS as string)
      pair = <IUniswapV2Pair>(await ethers.getContractAt("IUniswapV2Pair", pairAddress as string));

      const stakeFactory = await ethers.getContractFactory("SimplyStaking");
      anotherStake = <SimplyStaking>(await stakeFactory.deploy(pairAddress, token.address));

      await anotherStake.deployed();
      await token.mint(anotherStake.address, lpTokensAmount);
      await pair.connect(staker).approve(anotherStake.address, lpTokensAmount);

      clean = await network.provider.request({ method: "evm_snapshot", params: [] });
  });


  afterEach(async () => {
    await network.provider.request({ method: "evm_revert", params: [clean] });
    clean = await network.provider.request({ method: "evm_snapshot", params: [] });
  });


  describe("function setRewardRate", () => {

    it("Should revert if user not an admin", async () => {
        const rewardRate: number = 15;
        const promise = anotherStake.connect(staker).setRewardRate(rewardRate);
        await expect(promise).to.be.revertedWith(`AccessControl: account ${staker.address.toLowerCase()} is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775`);
    });


    it("Should set reward rate", async () => {
        const rewardRate: number = 15;
        await anotherStake.setRewardRate(rewardRate);
        expect(await anotherStake.rewardRate()).to.equal(rewardRate);
    });

  });


  describe("function setUnavailableTime", () => {

    it("Should revert if user not an admin", async () => {
        const rewardTime = 3 * 60;
        const promise = anotherStake.connect(staker).setUnavailableTime(rewardTime);
        await expect(promise).to.be.revertedWith(`AccessControl: account ${staker.address.toLowerCase()} is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775`);
    });

    it("Should set reward unavailable time", async () => {
        const rewardTime = 3 * 60;
        await anotherStake.setUnavailableTime(rewardTime);
        expect(await anotherStake.rewardTime()).to.equal(rewardTime);
    });

  });


  describe("function setUnstakeTime", () => {

    it("Should revert if user not an admin", async () => {
        const unstakeTime = 6 * 60;
        const promise =  anotherStake.connect(staker).setUnstakeTime(unstakeTime);
        await expect(promise).to.be.revertedWith(`AccessControl: account ${staker.address.toLowerCase()} is missing role 0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775`);
    });

    it("Should set unstake lock time", async () => {
        const unstakeTime = 6 * 60;
        await anotherStake.setUnstakeTime(unstakeTime);
        expect(await anotherStake.unstakeTime()).to.equal(unstakeTime);
    });

  });


  describe("function stake", () => {

    it("Should revert if not valid amount", async () => {
        await expect(anotherStake.stake(0)).to.be.revertedWith("Amount value is not allowed");
    });


    it("Should not revert if valid amount", async () => {
        await expect(anotherStake.stake(10)).not.to.be.revertedWith("Amount value is not allowed");
    });


    it("Should not update availableReward if rewardTime hasn't passed", async () => {
        const amount = ethers.BigNumber.from(10);
        await anotherStake.connect(staker).stake(amount);

        await ethers.provider.send("evm_increaseTime", [6 * 60]);
        await ethers.provider.send("evm_mine", []);

        await anotherStake.connect(staker).stake(amount);

        const balance = await anotherStake.connect(staker).balanceOfSender();
        expect(balance.availableReward).to.be.equal(BigNumber.from(0));
    }); 


    it("Should update availableReward if rewardTime hasn't passed", async () => {
        const amount = ethers.BigNumber.from(10);
        await anotherStake.connect(staker).stake(amount);

        await ethers.provider.send("evm_increaseTime", [6 * 60]);
        await ethers.provider.send("evm_mine", []);

        await anotherStake.connect(staker).stake(amount);

        const balance = await anotherStake.connect(staker).balanceOfSender();
        expect(balance.staked).to.be.equal(BigNumber.from(20));
        expect(balance.availableReward).to.be.equal(BigNumber.from(0));
        expect(balance.unavailableReward).to.be.equal(BigNumber.from(2));
    }); 


    it("Should update availableReward if rewardTime has passed", async () => {
        const amount = ethers.BigNumber.from(10);
        await anotherStake.connect(staker).stake(amount);

        await ethers.provider.send("evm_increaseTime", [12 * 60]);
        await ethers.provider.send("evm_mine", []);

        await anotherStake.connect(staker).stake(amount);

        const balance = await anotherStake.connect(staker).balanceOfSender();
        expect(balance.staked).to.be.equal(BigNumber.from(20));
        expect(balance.availableReward).to.be.equal(BigNumber.from(1));
        expect(balance.unavailableReward).to.be.equal(BigNumber.from(1));
    }); 


    it("Should emit event", async () => {
        const amount = ethers.BigNumber.from(1);
        await expect(anotherStake.connect(staker).stake(amount)).to.emit(anotherStake, "Stake").withArgs(staker.address, amount);
    });

  });


  describe("function unstake", () => {

    it("Should revert if usntake is not available", async () => {
        const amount = ethers.BigNumber.from(10);
        await anotherStake.connect(staker).stake(amount);

        await expect(anotherStake.connect(staker).unstake(amount)).to.be.revertedWith("Unstake is not available");
    });


    it("Should not revert if usntake is available", async () => {
        const amount = ethers.BigNumber.from(10);
        await anotherStake.connect(staker).stake(amount);

        await ethers.provider.send("evm_increaseTime", [12 * 60]);
        await ethers.provider.send("evm_mine", []);

        await expect(anotherStake.connect(staker).unstake(amount)).not.to.be.revertedWith("Unstake is not available");
    });


    it("Should revert if insufficent amount", async () => {
        const promise = anotherStake.unstake(1000);
        await expect(promise).to.be.revertedWith("Insufficient amount to unstake");
    });

    
    it("Should not revert if correct amount", async () => {
      const amount = ethers.BigNumber.from(10);
      await anotherStake.connect(staker).stake(amount);

      await ethers.provider.send("evm_increaseTime", [12 * 60]);
      await ethers.provider.send("evm_mine", []);

      const promise = anotherStake.connect(staker).unstake(10);
      await expect(promise).not.to.be.revertedWith("Insufficient amount to unstake");
    });


    it("Should emit event", async () => {
        const amount = ethers.BigNumber.from(10);
        await anotherStake.connect(staker).stake(amount);

        await ethers.provider.send("evm_increaseTime", [12 * 60]);
        await ethers.provider.send("evm_mine", []);
        
        await expect(anotherStake.connect(staker).unstake(amount)).to.emit(anotherStake, "Unstake").withArgs(staker.address, amount);
    });

  });


  describe("function claim", () => {
    
    it("Should revert if not enough tokens", async () => {
        await expect(anotherStake.claim()).to.be.revertedWith("Not enough tokens to withdraw");
    });

    
    it("Should be available all reward if rewardTime has passed", async () => {
        const amount = ethers.BigNumber.from(10);
          
        await anotherStake.connect(staker).stake(amount);

        await ethers.provider.send("evm_increaseTime", [12 * 60]);
        await ethers.provider.send("evm_mine", []);

        await anotherStake.connect(staker).stake(amount);

        await ethers.provider.send("evm_increaseTime", [4 * 60]);
        await ethers.provider.send("evm_mine", []);

        await anotherStake.connect(staker).claim();

        const balance = await anotherStake.connect(staker).balanceOfSender();

        expect(balance.staked).to.be.equal(BigNumber.from(20));
        expect(balance.availableReward).to.be.equal(BigNumber.from(0));
        expect(balance.unavailableReward).to.be.equal(BigNumber.from(1));
    });


    it("Should not revert if user has staked and rewardTime has passed", async () => {
        const amount = ethers.BigNumber.from(10);
        
        await anotherStake.connect(staker).stake(amount);

        await ethers.provider.send("evm_increaseTime", [12 * 60]);
        await ethers.provider.send("evm_mine", []);

        await expect(anotherStake.connect(staker).claim()).not.to.be.revertedWith("Not enough tokens to withdraw");
    });


    it("Should emit event", async () => {
        const amount = ethers.BigNumber.from(10);
        const reward = BigNumber.from(1);

        await anotherStake.connect(staker).stake(amount);

        await ethers.provider.send("evm_increaseTime", [12 * 60]);
        await ethers.provider.send("evm_mine", []);

        await expect(anotherStake.connect(staker).claim()).to.emit(anotherStake, "Claim").withArgs(staker.address, reward);
    });

  });


  describe("function balanceOfSender", async () => {
        const amount = ethers.BigNumber.from(10);
        const reward = BigNumber.from(1);

        await anotherStake.connect(staker).stake(amount);
        const balance = await anotherStake.connect(staker).balanceOfSender();
    
        expect(balance.unavailableReward).to.be.equal(reward);
        expect(balance.staked).to.be.equal(amount);
  });

});
