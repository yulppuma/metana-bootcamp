const { upgrades } = require("hardhat");

const ERC20ProxyAddress = "0xd5cA7d8707DCda5cAe0700BA106d6f75C9EAafd8";
const ERC721TokenV1ProxyAddress = "0xdAeaeBe4fAC5eA42946D3A0E7631436f2C21ADb6";
const StakeTokenV1ProxyAddress = "0xeC824b4995aA8ed48cb19f6397C936b79e535616";
const initialOwner = "0x17ffbcC299688241Ed00E0A88ab379eD99d3445B";

async function main(){
    //ERC721Token V2 upgrade
    const ERC721TokenV2Contract = await ethers.getContractFactory("StakeERC721TokenV2");
    console.log("Upgrading contract at: ", ERC721TokenV1ProxyAddress);
    const ERC721TokenV2 = await upgrades.upgradeProxy(ERC721TokenV1ProxyAddress, ERC721TokenV2Contract, {
        call: {
                fn: "initialize",
                args: [initialOwner],
            },
    });
    await ERC721TokenV2.waitForDeployment();
    console.log("ERC721 token Proxy address: ", await ERC721TokenV2.getAddress());

    //Stake V2 upgrade
    const StakeTokenV2Contract = await ethers.getContractFactory("StakeTokenV2");
    console.log("Upgrading contract at: ", StakeTokenV1ProxyAddress);
    const stakeTokenV2 = await upgrades.upgradeProxy(StakeTokenV1ProxyAddress, StakeTokenV2Contract, {
        call: {
                fn: "initialize",
                args: [ERC20ProxyAddress, ERC721TokenV1ProxyAddress, initialOwner],
            },
    });
    await stakeTokenV2.waitForDeployment();
    console.log("Stake token Proxy address: ", await stakeTokenV2.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });