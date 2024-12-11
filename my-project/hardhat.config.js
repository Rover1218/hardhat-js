require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
/** @type import('hardhat/config').HardhatUserConfig */

const { SEPOLIA, SECRET, ETHERUM } = process.env;
module.exports = {
  solidity: "0.8.19",
  networks: {
    sepolia: {
      url: SEPOLIA || "",
      accounts:
        SECRET !== undefined ? [SECRET] : [],
    },
  },
  etherscan: {
    apiKey: ETHERUM || "", // Note: fixed the property name from 'apikey' to 'apiKey'
  },
  sourcify: {
    enabled: true
  }
};
