import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { currency, formatCurrency } from '@/config/brand'

/** Monthly revenue for the last 12 months. */
export function Overview({ data = [] }) {
  const chartData = data && data.length > 0 ? data : [
    { name: 'Jan', total: 0 },
    { name: 'Feb', total: 0 },
    { name: 'Mar', total: 0 },
  ]

  return (
    <ResponsiveContainer width='100%' height={350}>
      <BarChart data={chartData}>
        <CartesianGrid
          strokeDasharray='3 3'
          vertical={false}
          className='stroke-muted'
        />
        <XAxis
          dataKey='name'
          stroke='#888888'
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          direction='ltr'
          stroke='#888888'
          fontSize={12}
          tickLine={false}
          axisLine={false}
          width={70}
          tickFormatter={(value) =>
            `${currency.symbol}${Number(value) >= 1000 ? `${(Number(value) / 1000).toFixed(0)}k` : value}`
          }
        />
        <Tooltip
          cursor={{
            className: 'fill-muted/50',
          }}
          contentStyle={{
            borderRadius: '0.5rem',
            border: '1px solid var(--border)',
            background: 'var(--background)',
            color: 'var(--foreground)',
            fontSize: '0.8rem',
          }}
          formatter={(value, _name, item) => [
            `${formatCurrency(Number(value))} · ${item?.payload?.orders ?? 0} orders`,
            'Revenue',
          ]}
        />
        <Bar
          dataKey='total'
          fill='currentColor'
          radius={[4, 4, 0, 0]}
          className='fill-primary'
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
