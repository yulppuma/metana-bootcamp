'use client';
import {blockData} from '../lib/blockData';
import BaseFeeChart from '../components/BaseFeeChart';
import ERC20VolumeChart from '../components/ERC20VolumeChart';
import GasRatioChart from '../components/GasRatioChart';
export default function DashboardPage() {
  const { latestBlocks } = blockData();
  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 px-4 py-8">
      <div className="bg-[#1a1a1a] p-4 rounded-2xl shadow">
        <h2 className="text-lg font-semibold mb-2">ERC20 Transfer Volume</h2>
        {/* USDT Volume Graph */}
          <ERC20VolumeChart data={latestBlocks}/>
      </div>

      <div className="bg-[#1a1a1a] p-4 rounded-2xl shadow">
        <h2 className="text-lg font-semibold mb-2">Base Fee Per Block</h2>
        {/* Base Fee Graph */}
        <BaseFeeChart data={latestBlocks}/>
      </div>

      <div className="bg-[#1a1a1a] p-4 rounded-2xl shadow">
        <h2 className="text-lg font-semibold mb-2">Gas Used / Gas Limit %</h2>
        {/* Gas Ratio Graph */}
        <GasRatioChart data={latestBlocks}/>
      </div>
    </div>
  );
}