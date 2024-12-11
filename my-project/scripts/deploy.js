const hre = require("hardhat");
const { formatEther } = require("ethers");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", formatEther(balance), "ETH");

    const Contract = await hre.ethers.getContractFactory("Sepolia");
    const contract = await Contract.deploy();

    // Wait for the deployment to be mined
    await contract.waitForDeployment();

    // Get the deployed contract address
    const deployedAddress = await contract.getAddress();
    console.log("Contract deployed to address:", deployedAddress);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Error deploying contract:", error);
        process.exit(1);
    });