"use client";
import { useEffect, useState } from 'react';
import { alchemy } from './alchemyClient';
import { ethers } from 'ethers';

const ERC20_TOKEN_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7'; // USDT (change this)
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'; //transfer event
const USDT_DECIMALS = 6;

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

          const transferLogs = await alchemy.core.getLogs({
            fromBlock: ethers.toBeHex(blockNumber),
            toBlock: ethers.toBeHex(blockNumber),
            address: [ERC20_TOKEN_ADDRESS],
            topics: [TRANSFER_TOPIC],
          });
          let transferVolume = 0n;
          for (let j = 0; j < transferLogs.length; j++) {
            const val = BigInt(transferLogs[j].data);
            transferVolume+=val;
          }
          const transferVolumeFormatted = ethers.formatUnits(transferVolume, USDT_DECIMALS);
          blocks.push({
            number: blockNumber,
            baseFee: ethers.formatUnits(baseFee, 'gwei'),
            gasUsed,
            gasLimit,
            gasUsageRatio: Number(((gasUsed / gasLimit) * 100).toFixed(2)),
            transferVolume: transferVolumeFormatted,
            timestamp: block.timestamp,
          });
        }
        setLatestBlocks(blocks);
      } catch (err) {
        console.error('Failed to fetch initial blocks:', err);
      }
    }

    async function handleNewBlock(blockNumber) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      try {
        const block = await alchemy.core.getBlock(blockNumber);
        const baseFee = block.baseFeePerGas?.toString() || '0';
        const gasUsed = Number(block.gasUsed);
        const gasLimit = Number(block.gasLimit);

        const transferLogs = await alchemy.core.getLogs({
            fromBlock: ethers.toBeHex(blockNumber),
            toBlock: ethers.toBeHex(blockNumber),
            address: [ERC20_TOKEN_ADDRESS],
            topics: [TRANSFER_TOPIC],
          });

        let transferVolume = 0n;
        for(let i = 0; i < transferLogs.length; i++){
          const val = BigInt(transferLogs[i].data);
          transferVolume+=val;
        }
        const transferVolumeFormatted = ethers.formatUnits(transferVolume, USDT_DECIMALS);
        const blockData = {
          number: blockNumber,
          baseFee: ethers.formatUnits(baseFee, 'gwei'),
          gasUsed,
          gasLimit,
          gasUsageRatio: Number(((gasUsed / gasLimit) * 100).toFixed(2)),
          transferVolume: transferVolumeFormatted,
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