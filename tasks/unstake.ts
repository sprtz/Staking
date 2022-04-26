import { task } from "hardhat/config";

task("unstake", "unstakes tokens")
  .addParam("contract", "contract address")
  .addParam("amount", "amount of tokens to transfer")
  .setAction(async (taskArgs, hre) => {

    const [signer] = await hre.ethers.getSigners();
    const staking = await hre.ethers.getContractAt("SimplyStaking", taskArgs.contract);
    const value = hre.ethers.utils.parseUnits(taskArgs.amount);

    await staking.unstake(value);

    console.log(`unstaked ${taskArgs.amount} of tokens to address ${signer.address}`);
});