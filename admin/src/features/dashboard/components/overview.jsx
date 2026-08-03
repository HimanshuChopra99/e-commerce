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
  // Normalize incoming data so Recharts always gets valid 'name' and 'total' keys
  const chartData = (data && data.length > 0 ? data : []).map((item) => {
    const val = Number(
      item.total ?? item.revenue ?? item.grand_total ?? item.amount ?? item.value ?? 0
    )
    return {
      name: item.name ?? item.month ?? item.label ?? 'Month',
      total: val,
      orders: item.orders ?? item.count ?? item.order_count ?? 0,
    }
  })

  return (
    <ResponsiveContainer width='100%' height={350}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
          stroke='#888888'
          fontSize={12}
          tickLine={false}
          axisLine={false}
          width={65}
          tickFormatter={(value) =>
            `${currency.symbol}${
              Number(value) >= 1000
                ? `${(Number(value) / 1000).toFixed(1)}k`
                : value
            }`
          }
        />
        <Tooltip
          cursor={{ className: 'fill-muted/20' }}
          contentStyle={{
            borderRadius: '0.5rem',
            border: '1px solid var(--border)',
            background: 'var(--background)',
            color: 'var(--foreground)',
            fontSize: '0.8rem',
          }}
          formatter={(value, _name, item) => [
            `${formatCurrency(Number(value))}${
              item?.payload?.orders ? ` · ${item.payload.orders} orders` : ''
            }`,
            'Revenue',
          ]}
        />
        <Bar
          dataKey='total'
          fill='hsl(var(--primary, 221.2 83.2% 53.3%))'
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}