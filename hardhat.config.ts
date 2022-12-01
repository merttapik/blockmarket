import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";
import "dotenv/config";

const GOERLI_URL=process.env.GOERLI_URL as string;
const PRIVATE_KEY = process.env.PRIVATE_KEY as string;


const config: HardhatUserConfig = {
  solidity: "0.8.17",
  networks:{
    goerli:{
      url: GOERLI_URL,
      accounts:[PRIVATE_KEY],

    },
  },
};

export default config;
