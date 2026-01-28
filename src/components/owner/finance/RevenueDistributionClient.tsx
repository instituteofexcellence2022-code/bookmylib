'use client'

import React, { useEffect, useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { getRevenueDistribution } from '@/actions/owner/finance'
import { Loader2 } from 'lucide-react'

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

interface DistributionItem {
  name: string
  value: number
}

interface TooltipPayload {
  name: string
  value: number
  payload: DistributionItem
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayload[]
}

export function RevenueDistributionClient() {
  const [data, setData] = useState<{ byMethod: DistributionItem[], byType: DistributionItem[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const result = await getRevenueDistribution()
        setData(result)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="h-[300px] flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
        <Loader2 className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (!data) return null

  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-gray-200 rounded shadow-sm text-sm">
          <p className="font-medium capitalize">{payload[0].name}</p>
          <p className="text-gray-500">₹{payload[0].value.toLocaleString()}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Revenue by Method */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Revenue by Method</h3>
        <div className="h-[250px] w-full">
          {data.byMethod.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.byMethod}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.byMethod.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span className="capitalize text-sm text-gray-600 dark:text-gray-300">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 mb-2" />
              <p className="text-sm">No revenue data</p>
            </div>
          )}
        </div>
      </div>

      {/* Revenue by Plan */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Revenue by Plan</h3>
        <div className="h-[250px] w-full">
          {data.byType.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.byType}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.byType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span className="capitalize text-sm text-gray-600 dark:text-gray-300">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 mb-2" />
              <p className="text-sm">No plan revenue data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
