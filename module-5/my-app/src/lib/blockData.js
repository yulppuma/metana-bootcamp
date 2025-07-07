"use client";
import { useEffect, useState } from 'react';
import { alchemy, alchemyWs } from './alchemyClient';
import { Alchemy, Network } from "alchemy-sdk";
import { ethers } from 'ethers';

const ERC20_TOKEN_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7'; // USDT (change this)

export function blockData() {
  const [latestBlocks, setLatestBlocks] = useState([]);

  useEffect(() => {
    async function handleNewBlock(blockNumber) {
      console.log("A new block has been mined.");
      await new Promise(resolve => setTimeout(resolve, 1000));
      try {
        const block = await alchemy.core.getBlock(blockNumber);
        const baseFee = block.baseFeePerGas?.toString() || '0';
        const gasUsed = Number(block.gasUsed);
        const gasLimit = Number(block.gasLimit);

        // Fetch ERC20 token transfers for this block
        let transfers = await alchemy.core.getAssetTransfers({
            fromBlock: `0x${blockNumber.toString(16)}`,
            toBlock: `0x${blockNumber.toString(16)}`,
            contractAddresses: [ERC20_TOKEN_ADDRESS],
            category: ["erc20"],
        });

        console.log(transfers.transfers);
        let totalVolume = 0;
        for(let i = 0; i < transfers.transfers.length; i++){
          const value = Number(ethers.parseUnits(transfers.transfers[i].value.toString(), 6));
          totalVolume+=value;
          console.log("New total: " + ethers.formatUnits(totalVolume, 6));
        }
        console.log(totalVolume);
        const totalVolumeFormatted = ethers.formatUnits(totalVolume, 6);
        console.log("formmatted FINAL totla: " + totalVolumeFormatted);
        const blockData = {
          number: blockNumber,
          baseFee: ethers.formatUnits(baseFee, 'gwei'),
          gasUsed,
          gasLimit,
          //transferVolume: Number(ethers.formatUnits(totalVolume, 6)), // USDT has 6 decimals
          timestamp: block.timestamp,
        };

        setLatestBlocks(prev => {
          const updated = [...prev, blockData];
          if (updated.length > 10) updated.shift();
          return updated;
        });
      } catch (error) {
        console.error(`Error processing block ${blockNumber}:`, error);
      }
    }

    alchemy.ws.on('block', handleNewBlock);

    return () => {
      alchemy.ws.off('block', handleNewBlock);
    };
  }, []);

  return { latestBlocks };
}