import { expect } from "chai";
import { ethers, network } from "hardhat";
import { Contract } from "ethers";
import { BigNumber } from "@ethersproject/bignumber";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { SPR20, IWETH, SimplyStaking, IUniswapV2Pair, IUniswapV2Factory, IUniswapV2Router02 } from "../typechain";



describe("SimplyStaking", function () {

  let owner: SignerWithAddress;
  let staker: SignerWithAddress;
  let spender: SignerWithAddress;

  let anotherToken: SPR20;
  let anotherStake: SimplyStaking;

  let pair: IUniswapV2Pair;
  let clean: any;
  

  beforeEach(async () => {

      [owner, staker, spender] = await ethers.getSigners();
  
      const tokenFactory = await ethers.getContractFactory("SPR20");
      anotherToken = <SPR20>(await tokenFactory.deploy());
      await anotherToken.deployed();

    
      const router = <IUniswapV2Router02>(await ethers.getContractAt("IUniswapV2Router02", process.env.ROUTER_ADDRESS as string));
      const factory = <IUniswapV2Factory>(await ethers.getContractAt("IUniswapV2Factory", process.env.FACTORY_ADDRESS as string));
      const iweth = <IWETH>(await ethers.getContractAt("IWETH", process.env.WETH_ADDRESS as string));


      const anotherTokensAmount = ethers.BigNumber.from(1000000);
      const etherTokensAmount = ethers.utils.parseEther("1");
      const minLiquidity = ethers.BigNumber.from(1000);
      const squareRoot = BigNumber.from(Math.sqrt(Number(anotherTokensAmount.mul(etherTokensAmount))));
      const lpTokensAmount = squareRoot.sub(minLiquidity);


      await iweth.connect(staker).deposit({ value: etherTokensAmount });
      
      await anotherToken.mint(staker.address, 10000);
      await anotherToken.connect(staker).approve(router.address, ethers.constants.MaxUint256);
    
      const deadline = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp + 100
      

      await router.connect(staker).addLiquidityETH(
          anotherToken.address,
          10000, 
          0,
          etherTokensAmount,
          staker.address,
          deadline,
        { value: etherTokensAmount });
      


      const pairAddress = await factory.getPair(anotherToken.address, process.env.WETH_ADDRESS as string)
      pair = <IUniswapV2Pair>(await ethers.getContractAt("IUniswapV2Pair", pairAddress as string));

      const stakeFactory = await ethers.getContractFactory("SimplyStaking");
      anotherStake = <SimplyStaking>(await stakeFactory.deploy(pairAddress, anotherStake.address));

      await anotherStake.deployed();

      await pair.connect(staker).approve(anotherStake.address, lpTokensAmount);
      await anotherToken.mint(anotherStake.address, lpTokensAmount);

      clean = await network.provider.request({ method: "evm_snapshot", params: [] });
  });


  afterEach(async () => {
    await network.provider.request({ method: "evm_revert", params: [clean] });
    clean = await network.provider.request({ method: "evm_snapshot", params: [] });
  });


  describe("function setRewardRate", () => {

      it("Should set reward rate", async () => {
          const rewardRate = 10;
          await anotherStake.setRewardRate(rewardRate);
          expect(await anotherStake.rewardRate()).to.equal(rewardRate);
      });

  });


  describe("function setUnavailableTime", () => {

    it("Should set reward unavailable time", async () => {
        const rewardTime = 3 * 60;
        await anotherStake.setUnavailableTime(rewardTime);
        expect(await anotherStake.rewardTime()).to.equal(rewardTime);
    });

  });


  describe("function setUnstakeTime", () => {

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


    it("Should emit event", async () => {
        const amount = ethers.BigNumber.from(30);
        await expect(anotherStake.stake(amount)).to.emit(anotherStake, "Stake").withArgs(owner.address, amount);
    });


    it("Should stake amount of tokens", async () => {
        const amount = ethers.BigNumber.from(30);
        await anotherStake.connect(staker).stake(amount);

        await ethers.provider.send("evm_increaseTime", [6 * 60]);
        await ethers.provider.send("evm_mine", []);

        await anotherStake.connect(staker).unstake(amount);
        expect(await anotherToken.balanceOf(staker.address)).to.equal(amount);
    });
  });


  describe("function unstake", () => {

    it("Should revert if insufficent amount", async () => {
        const promise = anotherStake.unstake(10000000000);
        await expect(promise).to.be.revertedWith("Insufficient amount to unstake");
    });


    it("Should emit event", async () => {
        const amount = ethers.BigNumber.from(20);
        await anotherStake.connect(staker).stake(amount);

        await ethers.provider.send("evm_increaseTime", [6 * 60]);
        await ethers.provider.send("evm_mine", []);
        
        await expect(anotherStake.unstake(amount)).to.emit(anotherStake, "Unstake").withArgs(owner.address, amount);
    });


    it("Should unstake lp tokens", async () => {
        const amount = ethers.BigNumber.from(20);
        await anotherStake.connect(staker).stake(amount);

        await ethers.provider.send("evm_increaseTime", [6 * 60]);
        await ethers.provider.send("evm_mine", []);
        
        // await expect(pair);

        await anotherStake.connect(staker).unstake(amount);
        
        expect(await anotherToken.balanceOf(staker.address)).to.equal(22); 

    });

  });


  describe("function claim", () => {
    
    it("Should revert if not enough tokens", async () => {
        expect(await anotherStake.claim()).to.be.revertedWith("Not enough tokens to withdraw");
    });


    it("Should emit event", async () => {
        const amount = ethers.BigNumber.from(20);
        await expect(anotherStake.claim()).to.emit(anotherStake, "Claim").withArgs(owner.address, amount);
    });


    it("Should claim reward", async () => {
        const amount = ethers.BigNumber.from(20);
        await anotherStake.connect(staker).stake(amount);

        await ethers.provider.send("evm_increaseTime", [6 * 60]);
        await ethers.provider.send("evm_mine", []);

        await anotherStake.connect(staker).claim();


    });

  });

});
