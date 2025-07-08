'use client';
import {LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer} from 'recharts';

export default function GasRatioChart({ data }) {
  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 40, bottom: 40, left: 20 }}>
            <XAxis dataKey="number" label={{value: 'Block Number', position: 'insideBottom', offset: -15}} tick={{ fill: '#FFFFFF', fontSize: 12 }} interval={0} dy={10} />
            <YAxis label={{ value: 'Gas Ratio (%)', angle: -90, position: 'insideCenter', dx: -40}} tick={{ fill: '#FFFFFF', fontSize: 12 }} tickFormatter={(v) => `${v}%`}/>
            <Tooltip labelFormatter={(label) => `Block Number: ${label}`} labelStyle={{color: '#FFFFFF'}} contentStyle={{backgroundColor: '#1a1a1a', borderColor: '#374151',color: '#FFFFFF'}}/>
            <Line type="monotone" dataKey="gasUsageRatio" name="Gas Usage (%)" stroke="#f43f5e" strokeWidth={2}/>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
