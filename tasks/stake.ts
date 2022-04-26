import { task } from "hardhat/config";
import * as dotenv from "dotenv";

dotenv.config();


task("stake", "stakes tokens")
  .addParam("contract", "contract address")
  .addParam("amount", "amount of tokens to transfer")
  .setAction(async (taskArgs, hre) => {

    const [signer] = await hre.ethers.getSigners();
    const staking = await hre.ethers.getContractAt("SimplyStaking", taskArgs.contract);
    const lpToken = await hre.ethers.getContractAt("SPR20", process.env.TOKEN_ADDRESS as string);

    const decimals = await lpToken.decimals();
    const symbol = await lpToken.symbol();
    const value = hre.ethers.utils.parseUnits(taskArgs.amount, decimals);

    await lpToken.approve(staking.address, value);
    console.log(`approved for staking contract usage ${taskArgs.amount} ${symbol} tokens`);

    await staking.stake(value);

    console.log(`staked ${taskArgs.amount} ${symbol} tokens from address ${signer.address}`);
});