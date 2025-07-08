'use client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid} from 'recharts';

export default function BaseFeeChart({ data }) {
  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 40, bottom: 40, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey="number" label={{value: 'Block Number', position: 'insideBottom', offset: -15}} tick={{ fill: '#FFFFFF', fontSize: 12 }} interval={0} dy={10}/>
          <YAxis  domain={['auto', 'auto']} tick={{ fill: '#FFFFFF', fontSize: 12 }} tickFormatter={(value) => value.toFixed(2)} label={{value: 'Gwei', angle: -90, position:'insideCenter', dx:-40}} />
          <Tooltip labelFormatter={(label) => `Block Number: ${label}`} labelStyle={{color: '#FFFFFF'}} contentStyle={{backgroundColor: '#1a1a1a', borderColor: '#374151',color: '#FFFFFF'}}/>
          <Line type="monotone" dataKey="baseFee" name="Base Fee (Gwei)" stroke="#00bcd4" strokeWidth={2} dot={false}/>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
