import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { costBars, paybackLines, pickPaybackQuotes } from '../../lib/chartData.js';
import { inr } from '../../lib/utils.js';

// Colours fixed to the quote's position, so a vendor keeps its colour. Dashes keep the lines
// distinct for colour-blind readers.
const LINE_STYLES = [
  { stroke: '#15803d', dash: undefined },
  { stroke: '#c2410c', dash: '8 4' },
  { stroke: '#2563eb', dash: '2 4' },
];
const PAY = '#15803d';
const SUBSIDY = '#ca8a04';
const AXIS = { fontSize: 12, fill: '#4b5563' };
const lakh = v => (v === 0 ? '₹0' : `${v < 0 ? '−' : ''}₹${(Math.abs(v) / 100000).toFixed(1)}L`);
const COST_ORDER = ['You pay', 'Government subsidy', 'Subsidy at risk'];
const costOrder = item => COST_ORDER.indexOf(item.name ?? item.value);
const legendText = value => <span style={{ color: '#374151' }}>{value}</span>;

export function UsageBars({ usedUnits, generatedUnits }) {
  const max = Math.max(usedUnits, generatedUnits, 1);
  const rows = [['You use', usedUnits, 'bg-gray-500'], ['Solar could make', generatedUnits, 'bg-yellow-500']];
  return (
    <div className="space-y-3" role="img" aria-label={`You use ${usedUnits} units a month. Solar could make about ${generatedUnits} units a month.`}>
      {rows.map(([label, value, color]) => (
        <div key={label}>
          <div className="flex justify-between text-sm"><span className="text-gray-600">{label}</span><span className="font-bold text-gray-900">{value} units a month</span></div>
          <div className="mt-1 h-3 rounded-full bg-gray-100 overflow-hidden"><div className={`h-full rounded-full ${color}`} style={{ width: value / max * 100 + '%' }} /></div>
        </div>
      ))}
    </div>
  );
}

export function CostChart({ quotes }) {
  const data = costBars(quotes);
  if (!data.length) return null;
  const hasRisk = data.some(d => d.atRisk > 0);
  return (
    <figure>
      <figcaption className="font-bold text-gray-800 text-sm">What each quote costs you</figcaption>
      <div style={{ height: 70 + data.length * 52 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 0 }} barCategoryGap="28%">
            <defs>
              <pattern id="risk-hatch" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)">
                <rect width="7" height="7" fill="#fef3c7" /><rect width="3" height="7" fill={SUBSIDY} />
              </pattern>
            </defs>
            <CartesianGrid horizontal={false} stroke="#f3f4f6" />
            <XAxis type="number" tickFormatter={lakh} tick={AXIS} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={150} tick={AXIS} axisLine={false} tickLine={false} />
            <Tooltip formatter={v => inr(v)} cursor={{ fill: '#f9fafb' }} itemSorter={costOrder} itemStyle={{ color: '#374151' }} />
            <Legend iconType="square" wrapperStyle={{ fontSize: 12 }} formatter={legendText} itemSorter={costOrder} />
            <Bar dataKey="pay" name="You pay" stackId="cost" fill={PAY} stroke="#fff" strokeWidth={2} isAnimationActive={false} />
            <Bar dataKey="subsidy" name="Government subsidy" stackId="cost" fill={SUBSIDY} stroke="#fff" strokeWidth={2} isAnimationActive={false} />
            {hasRisk && <Bar dataKey="atRisk" name="Subsidy at risk" stackId="cost" fill="url(#risk-hatch)" stroke="#fff" strokeWidth={2} isAnimationActive={false} />}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

export function PaybackChart({ quotes, recommendedId }) {
  const picked = pickPaybackQuotes(quotes, recommendedId);
  if (!picked.length) return null;
  const data = paybackLines(picked);
  return (
    <figure>
      <figcaption className="font-bold text-gray-800 text-sm">When you get your money back</figcaption>
      <p className="text-xs text-gray-500 mt-0.5">Each line shows your position over time. Crossing ₹0 means the bill savings have repaid what you paid.</p>
      <div className="mt-2" style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#f3f4f6" />
            <XAxis dataKey="year" tick={AXIS} tickLine={false} axisLine={{ stroke: '#d1d5db' }} label={{ value: 'Years after installation', position: 'insideBottom', offset: -2, fontSize: 12, fill: '#4b5563' }} height={42} />
            <YAxis tickFormatter={lakh} tick={AXIS} width={56} axisLine={false} tickLine={false} />
            <ReferenceLine y={0} stroke="#374151" strokeWidth={1.5} label={{ value: 'Money back', position: 'insideTopRight', fontSize: 12, fill: '#374151' }} />
            <Tooltip formatter={(v, name) => [inr(Math.abs(v)) + (v < 0 ? ' still to recover' : ' ahead'), name]} labelFormatter={y => `Year ${y}`} itemStyle={{ color: '#374151' }} />
            <Legend wrapperStyle={{ fontSize: 12 }} formatter={legendText} />
            {picked.map((q, i) => (
              <Line key={q.quoteId} dataKey={q.quoteId} name={q.vendorName} stroke={LINE_STYLES[i].stroke} strokeDasharray={LINE_STYLES[i].dash}
                strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
