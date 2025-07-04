'use client';
import {blockData} from '../lib/blockData';

export default function DashboardPage() {
  const { latestBlocks } = blockData();
  return (
    <div className="max-w-7xl mx-auto grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
      <div className="bg-[#1a1a1a] p-4 rounded-2xl shadow">
        <h2 className="text-lg font-semibold mb-2">ERC20 Transfer Volume</h2>
        {/* Graph 1 */}
          <ul className="text-sm font-mono space-y-2">
            {latestBlocks.map((block) => (
              <li key={block.number} className="bg-gray-800 rounded-lg p-3">
                <strong>Block #{block.number}</strong><br />
                Base Fee: {block.baseFee} Gwei<br />
                Gas Used: {block.gasUsed} / {block.gasLimit}<br />
                ERC20 Volume: {block.transferVolume}
              </li>
            ))}
        </ul>
      </div>

      <div className="bg-[#1a1a1a] p-4 rounded-2xl shadow">
        <h2 className="text-lg font-semibold mb-2">Base Fee Per Block</h2>
        {/* Graph 2 */}
      </div>

      <div className="bg-[#1a1a1a] p-4 rounded-2xl shadow">
        <h2 className="text-lg font-semibold mb-2">Gas Used / Gas Limit %</h2>
        {/* Graph 3 */}
      </div>
    </div>
  );
}