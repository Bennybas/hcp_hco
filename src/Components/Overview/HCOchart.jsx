import React, { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

const HCOchart = ({ HCOdata }) => {
  const formatSegmentName = (segment) => {
    segment = segment.replace(/-/g, '').toUpperCase()
    if (segment === 'TIER 1') return 'Tier 1'
    if (segment === 'TIER 2') return 'Tier 2'
    if (segment === 'TIER 3') return 'Tier 3'
    return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase()
  }

  const segmentData = useMemo(() => {
    if (!HCOdata || !Array.isArray(HCOdata) || HCOdata.length === 0) return []

    const segmentHCOMap = new Map()
    HCOdata.forEach((record) => {
      if (record.hco_mdm_tier && record.hco_mdm) {
        const tier = record.hco_mdm_tier.replace(/-/g, '').trim().toUpperCase()
        if (!tier) return
        if (!segmentHCOMap.has(tier)) {
          segmentHCOMap.set(tier, new Set())
        }
        segmentHCOMap.get(tier).add(record.hco_mdm)
      }
    })

    const result = Array.from(segmentHCOMap).map(([name, hcoSet]) => ({
      name: formatSegmentName(name),
      value: hcoSet.size,
    }))

    const orderMap = { 'TIER 1': 0, 'TIER 2': 1, 'TIER 3': 2 }
    result.sort((a, b) => {
      const aOrder = orderMap[a.name.toUpperCase()] ?? 999
      const bOrder = orderMap[b.name.toUpperCase()] ?? 999
      return aOrder - bOrder
    })

    return result
  }, [HCOdata])

  const colors = ['#217fad']

  return (
    <div className="flex flex-col bg-white rounded-xl border border-gray-300 w-full h-64 p-4">
      <div className="flex gap-2 items-center mb-3">
        <div className="bg-blue-100 rounded-full h-6 w-6 p-1 flex justify-center items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 576 512"
            className="text-blue-800 h-4 w-4"
          >
            <path
              fill="currentColor"
              d="M142.4 21.9c5.6 16.8-3.5 34.9-20.2 40.5L96 71.1V192c0 53 43 96 96 96s96-43 96-96V71.1l-26.1-8.7c-16.8-5.6-25.8-23.7-20.2-40.5s23.7-25.8 40.5-20.2l26.1 8.7C334.4 19.1 352 43.5 352 71.1V192c0 77.2-54.6 141.6-127.3 156.7C231 404.6 278.4 448 336 448c61.9 0 112-50.1 112-112V265.3c-28.3-12.3-48-40.5-48-73.3c0-44.2 35.8-80 80-80s80 35.8 80 80c0 32.8-19.7 61-48 73.3V336c0 97.2-78.8 176-176 176c-92.9 0-168.9-71.9-175.5-163.1C87.2 334.2 32 269.6 32 192V71.1c0-27.5 17.6-52 43.8-60.7l26.1-8.7c16.8-5.6 34.9 3.5 40.5 20.2zM480 224c17.7 0 32-14.3 32-32s-14.3-32-32-32s-32 14.3-32 32s14.3 32 32 32z"
            />
          </svg>
        </div>
        <span className="text-gray-500 text-xs font-medium">
          HCO Cluster by Treated Patient Volume
        </span>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={segmentData}
          margin={{ top: 10, right: 30, left: -20, bottom: 10 }}
        >
          <XAxis type="number" tick={{ fontSize: 10 }} hide />
          <YAxis
            dataKey="name"
            type="category"
            tick={{ fontSize: 12 }}
            width={70}
          />
          <Tooltip  wrapperStyle={{ fontSize: '10px' }}/>
          <Bar dataKey="value" radius={[0, 10, 10, 0]}>
            {segmentData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default HCOchart
