"use client"

import { useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

const PrescriberClusterChart = ({ hcpData, onSegmentClick, selectedSegment }) => {
  const formatSegmentName = (segment) => {
    if (!segment) return ""
    segment = segment.toUpperCase()
    if (["VERY LOW", "V. LOW", "V.LOW", "VLOW"].includes(segment)) return "V. LOW"
    if (segment === "LOW") return "LOW"
    if (["MODERATE", "MED", "MEDIUM"].includes(segment)) return "MEDIUM"
    if (segment === "HIGH") return "HIGH"
    return segment
  }

  const segmentData = useMemo(() => {
    if (!hcpData || !Array.isArray(hcpData) || hcpData.length === 0) return []

    const segmentPatientMap = new Map()

    hcpData.forEach((record) => {
      if (record.hcp_segment && record.patient_id) {
        const rawSegment = record.hcp_segment.toUpperCase()
        const formattedSegment = formatSegmentName(rawSegment)
        if (!segmentPatientMap.has(formattedSegment)) {
          segmentPatientMap.set(formattedSegment, new Set())
        }
        segmentPatientMap.get(formattedSegment).add(record.patient_id)
      }
    })

    const result = Array.from(segmentPatientMap).map(([name, patientSet]) => ({
      name,
      value: patientSet.size,
      isSelected: selectedSegment === name,
    }))

    const orderMap = { HIGH: 0, MEDIUM: 1, LOW: 2, "V. LOW": 3 }
    result.sort((a, b) => (orderMap[a.name] ?? 999) - (orderMap[b.name] ?? 999))

    return result
  }, [hcpData, selectedSegment])

  const COLORS = ["#217fad"]
  const SELECTED_COLOR = "#0c4a6e"

  const handleBarClick = (data) => {
    if (onSegmentClick) {
      onSegmentClick(data.name)
    }
  }

  return (
    <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-64 p-2">
      {/* Header */}
      <div className="flex gap-2 items-center mb-2">
        <div className="bg-blue-100 rounded-full h-6 w-6 p-1 flex justify-center items-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" className="text-blue-800 h-4 w-4">
            <path
              fill="currentColor"
              d="M142.4 21.9c5.6 16.8-3.5 34.9-20.2 40.5L96 71.1V192c0 53 43 96 96 96s96-43 96-96V71.1l-26.1-8.7c-16.8-5.6-25.8-23.7-20.2-40.5s23.7-25.8 40.5-20.2l26.1 8.7C334.4 19.1 352 43.5 352 71.1V192c0 77.2-54.6 141.6-127.3 156.7C231 404.6 278.4 448 336 448c61.9 0 112-50.1 112-112V265.3c-28.3-12.3-48-40.5-48-73.3c0-44.2 35.8-80 80-80s80 35.8 80 80c0 32.8-19.7 61-48 73.3V336c0 97.2-78.8 176-176 176c-92.9 0-168.9-71.9-175.5-163.1C87.2 334.2 32 269.6 32 192V71.1c0-27.5 17.6-52 43.8-60.7l26.1-8.7c16.8-5.6 34.9 3.5 40.5 20.2zM480 224c17.7 0 32-14.3 32-32s-14.3-32-32-32s-32 14.3-32 32s14.3 32 32 32z"
            />
          </svg>
        </div>
        <span className="text-gray-500 text-xs font-medium">Prescriber Cluster by Treated Patient Volume</span>

        {selectedSegment && (
          <span className="ml-2 text-[10px] text-blue-600">(Click on selected bar to clear filter)</span>
        )}
      </div>

      {/* Chart */}
      <div className="flex-grow">
        {segmentData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={segmentData} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 10 }} />
              <Tooltip
                cursor={{ fill: "#f0f0f0" }}
                wrapperStyle={{ fontSize: "10px" }}
                formatter={(value) => [`${value} patients`, "Volume"]}
              />
              <Bar dataKey="value" radius={[0, 10, 10, 0]} onClick={handleBarClick} cursor="pointer">
                {segmentData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isSelected ? SELECTED_COLOR : COLORS[0]}
                    stroke={entry.isSelected ? "#000" : "none"}
                    strokeWidth={entry.isSelected ? 1 : 0}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-sm text-gray-500 text-center pt-4">No data available</div>
        )}
      </div>
    </div>
  )
}

export default PrescriberClusterChart
