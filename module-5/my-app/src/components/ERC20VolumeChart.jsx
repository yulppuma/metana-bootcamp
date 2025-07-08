'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ERC20VolumeChart({ data }) {
  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 40, bottom: 40, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey="number" label={{value: 'Block Number', position: 'insideBottom', offset: -10}} tick={{ fill: '#FFFFFF', fontSize: 12 }}/>
          <YAxis tick={{ fill: '#FFFFFF', fontSize: 12 }} label={{value: 'USDT Transfers', angle: -90, position: 'insideCenter', dx: -40}}/>
          <Tooltip labelFormatter={(label) => `Block Number: ${label}`} labelStyle={{color: '#FFFFFF'}} contentStyle={{backgroundColor: '#1a1a1a', borderColor: '#374151',color: '#FFFFFF'}}/>
          <Bar dataKey="transferVolume" name="ERC20 Volume (USDT)" fill="#10b981" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
