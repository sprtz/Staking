import { task } from "hardhat/config";

task("claim", "claim reward tokens")
  .addParam("contract", "contract address")
  .setAction(async (taskArgs, hre) => {

    const [signer] = await hre.ethers.getSigners();
    const staking = await hre.ethers.getContractAt("SimplyStaking", taskArgs.contract);

    await staking.claim();

    console.log(`claimed rewards to address ${signer.address}`);
});