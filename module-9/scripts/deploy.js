async function main(){
    const ERC20TokenContract = await ethers.getContractFactory("StakeERC20TokenV1");
    console.log("Deploying ERC20 Token contract...");
    const ERC20Token = await upgrades.deployProxy(ERC20TokenContract, [], {
        initializer: 'initialize'
    });
    await ERC20Token.waitForDeployment();
    const ERC20TokenAddress = await ERC20Token.getAddress();
    console.log("ERC20 Token deploy to: ", ERC20TokenAddress);

    const ERC721TokenContract = await ethers.getContractFactory("StakeERC721TokenV1");
    console.log("Deploying ERC721 Token contract...");
    const ERC721Token = await upgrades.deployProxy(ERC721TokenContract, [], {
        initializer: 'initialize'
    });
    await ERC721Token.waitForDeployment();
    const ERC721TokenAddress = await ERC721Token.getAddress();
    console.log("ERC721 Token deploy to: ", ERC721TokenAddress);

    const StakeContract = await ethers.getContractFactory("StakeTokenV1");
    console.log("Deploying Stake contract...");
    const stakeContract = await upgrades.deployProxy(StakeContract, [ERC20TokenAddress, ERC721TokenAddress], {
        initializer: 'initialize'
    });
    await stakeContract.waitForDeployment();
    const stakeContractAddress = await stakeContract.getAddress();
    console.log("Stake contract deploy to: ", stakeContractAddress);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });