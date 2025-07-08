"use client";
import { useEffect, useState } from 'react';
import { alchemy, alchemyWs } from './alchemyClient';
import { ethers } from 'ethers';

const ERC20_TOKEN_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7'; // USDT (change this)

export function blockData() {
  const [latestBlocks, setLatestBlocks] = useState([]);

  useEffect(() => {
    async function loadInitialBlocks() {
      try {
        const latestBlockNumber = await alchemy.core.getBlockNumber();
        const blocks = [];

        for (let i = 9; i >= 0; i--) {
          const blockNumber = latestBlockNumber - i;
          const block = await alchemy.core.getBlock(blockNumber);
          const baseFee = block.baseFeePerGas?.toString() || '0';
          const gasUsed = Number(block.gasUsed);
          const gasLimit = Number(block.gasLimit);

          const transfers = await alchemy.core.getAssetTransfers({
            fromBlock: `0x${blockNumber.toString(16)}`,
            toBlock: `0x${blockNumber.toString(16)}`,
            contractAddresses: [ERC20_TOKEN_ADDRESS],
            category: ['erc20'],
          });

          let totalVolume = 0;
          for (let j = 0; j < transfers.transfers.length; j++) {
            const value = Number(ethers.parseUnits(transfers.transfers[j].value.toString(), 6));
            totalVolume += value;
          }

          const totalVolumeFormatted = ethers.formatUnits(totalVolume, 6);

          blocks.push({
            number: blockNumber,
            baseFee: ethers.formatUnits(baseFee, 'gwei'),
            gasUsed,
            gasLimit,
            gasUsageRatio: Number(((gasUsed / gasLimit) * 100).toFixed(2)),
            transferVolume: totalVolumeFormatted,
            timestamp: block.timestamp,
          });
        }
        setLatestBlocks(blocks);
      } catch (err) {
        console.error('Failed to fetch initial blocks:', err);
      }
    }

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
        let totalVolume = 0;
        for(let i = 0; i < transfers.transfers.length; i++){
          const value = Number(ethers.parseUnits(transfers.transfers[i].value.toString(), 6));
          totalVolume+=value;
        }
        const totalVolumeFormatted = ethers.formatUnits(totalVolume, 6);
        const blockData = {
          number: blockNumber,
          baseFee: ethers.formatUnits(baseFee, 'gwei'),
          gasUsed,
          gasLimit,
          gasUsageRatio: Number(((gasUsed / gasLimit) * 100).toFixed(2)),
          transferVolume: totalVolumeFormatted,
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

    async function init(){
      await loadInitialBlocks();
      alchemy.ws.on('block', handleNewBlock);
    }

    init();
    return () => {
      alchemy.ws.off('block', handleNewBlock);
    };
  }, []);

  return { latestBlocks };
}