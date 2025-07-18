import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Contract } from 'ethers';
import { ethers } from 'hardhat';
const { utils, provider } = ethers;

describe('GuessTheNewNumberChallenge', () => {
  let target: Contract;
  let attackContract : Contract;
  let deployer: SignerWithAddress;
  let attacker: SignerWithAddress;

  before(async () => {
    [attacker, deployer] = await ethers.getSigners();

    target = await (
      await ethers.getContractFactory('GuessTheNewNumberChallenge', deployer)
    ).deploy({
      value: utils.parseEther('1'),
    });

    await target.deployed();

    target = await target.connect(attacker);

    attackContract = await (
      await ethers.getContractFactory('AttackGuessTheNewNumberChallenge', deployer)
    ).deploy(target.address);
    
    await attackContract.deployed();
    //Deploy attack contract instance
    attackContract = await attackContract.connect(attacker);
  });

  //An attacker contract can be used to generate the 'random' value in the same transaction call to use as my guess
  it('exploit', async () => {
    expect(await provider.getBalance(attackContract.address)).to.equal(0);
    //Generate the 'random' answer and use it as my input
    const attackTx = await attackContract.attack({value: utils.parseEther('1'),});
    await attackTx.wait();
    expect(await provider.getBalance(attackContract.address)).to.equal(utils.parseEther('2'));

    const withdrawTx = await attackContract.withdraw();
    await withdrawTx.wait();
    expect(await provider.getBalance(attackContract.address)).to.equal(0);
    expect(await provider.getBalance(target.address)).to.equal(0);
  });
});
