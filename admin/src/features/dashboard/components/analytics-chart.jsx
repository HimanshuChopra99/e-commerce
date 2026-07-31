import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { orders } from '@/data/seed'
import { currency, formatCurrency } from '@/config/brand'

/** Revenue + order count for each of the last 7 days. */
const NOW = new Date('2026-07-28')
const DAY = 86_400_000
const data = Array.from(
  {
    length: 7,
  },
  (_, i) => {
    const start = new Date(NOW.getTime() - (6 - i) * DAY)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start.getTime() + DAY)
    const bucket = orders.filter(
      (o) => o.status !== 'cancelled' && o.placedAt >= start && o.placedAt < end
    )
    return {
      name: start.toLocaleDateString('en-US', {
        weekday: 'short',
      }),
      revenue: Math.round(bucket.reduce((sum, o) => sum + o.total, 0)),
      orders: bucket.length,
    }
  }
)
export function AnalyticsChart() {
  return (
    <ResponsiveContainer width='100%' height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id='revenueFill' x1='0' y1='0' x2='0' y2='1'>
            <stop offset='5%' stopColor='currentColor' stopOpacity={0.35} />
            <stop offset='95%' stopColor='currentColor' stopOpacity={0} />
          </linearGradient>
        </defs>
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
        <Area
          type='monotone'
          dataKey='revenue'
          stroke='currentColor'
          strokeWidth={2}
          fill='url(#revenueFill)'
          className='text-primary'
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
