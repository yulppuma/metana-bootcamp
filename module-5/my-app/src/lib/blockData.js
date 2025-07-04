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

        /*const totalVolume = transfers.transfers.reduce((sum, transfer) => {
            console.log("ERC20 T", transfer);
            const valueAsString = (transfer?.value || '0').toString();
            const value = ethers.parseUnits(valueAsString, 6);
            const newValue = BigInt(valueAsString);
            
            return sum + newValue;
        }, 0n);*/

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