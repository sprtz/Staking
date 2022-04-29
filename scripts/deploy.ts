import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();


async function main() {
  
  const lpAddress = process.env.LPTOKEN_ADDRESS as string || "";
  const tokenAddress = process.env.TOKEN_ADDRESS as string || "";

  const stakingContractFactory = await ethers.getContractFactory("SimplyStaking");
  const stakingContract = await stakingContractFactory.deploy(tokenAddress, lpAddress);

  await stakingContract.deployed();

  console.log("staking contract deployed to: ", stakingContract.address);
  console.log("token address: ", tokenAddress);
  console.log("lp address: ", lpAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});