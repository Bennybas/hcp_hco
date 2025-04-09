"use client"

import { useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

const HCOchart = ({ HCOdata, onGroupingClick, selectedGrouping }) => {
  const formatGroupName = (group) => {
    if (!group || group === "-") return "UNSPECIFIED"
    group = group.replace(/-/g, "").trim().toUpperCase()
    if (group === "DELETE") return "UNSPECIFIED"
    return group.toUpperCase()
  }

  const displayOrder = [
    "CURRENT IV",
    "IV AFFILIATES",
    "NEW IT TREATMENT CENTERS",
    "NEW TREATMENT CENTERS",
    "UNSPECIFIED",
  ]

  const segmentData = useMemo(() => {
    if (!HCOdata || !Array.isArray(HCOdata) || HCOdata.length === 0) return []

    const groupMap = new Map()

    HCOdata.forEach((record) => {
      let group = record.hco_grouping
      const patient = record.patient_id

      if (!group || group === "-" || !patient) return

      group = formatGroupName(group)

      if (!groupMap.has(group)) {
        groupMap.set(group, new Set())
      }
      groupMap.get(group).add(patient)
    })

    const result = displayOrder.map((group) => {
      const count = groupMap.has(group) ? groupMap.get(group).size : 0
      return {
        name: group,
        value: count,
        isSelected: selectedGrouping === group,
      }
    })

    return result
  }, [HCOdata, selectedGrouping])

  const colors = ["#217fad"]
  const selectedColor = "#0c4a6e"

  const handleBarClick = (data) => {
    if (onGroupingClick) {
      onGroupingClick(data.name)
    }
  }

  return (
    <div className="flex flex-col bg-white rounded-xl border border-gray-300 w-full h-64 p-4">
      <div className="flex gap-2 items-center mb-3">
        <div className="bg-blue-100 rounded-full h-6 w-6 p-1 flex justify-center items-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" className="text-blue-800 h-4 w-4">
            <path
              fill="currentColor"
              d="M142.4 21.9c5.6 16.8-3.5 34.9-20.2 40.5L96 71.1V192c0 53 43 96 96 96s96-43 96-96V71.1l-26.1-8.7c-16.8-5.6-25.8-23.7-20.2-40.5s23.7-25.8 40.5-20.2l26.1 8.7C334.4 19.1 352 43.5 352 71.1V192c0 77.2-54.6 141.6-127.3 156.7C231 404.6 278.4 448 336 448c61.9 0 112-50.1 112-112V265.3c-28.3-12.3-48-40.5-48-73.3c0-44.2 35.8-80 80-80s80 35.8 80 80c0 32.8-19.7 61-48 73.3V336c0 97.2-78.8 176-176 176c-92.9 0-168.9-71.9-175.5-163.1C87.2 334.2 32 269.6 32 192V71.1c0-27.5 17.6-52 43.8-60.7l26.1-8.7c16.8-5.6 34.9 3.5 40.5 20.2zM480 224c17.7 0 32-14.3 32-32s-14.3-32-32-32s-32 14.3-32 32s14.3 32 32 32z"
            />
          </svg>
        </div>
        <span className="text-gray-500 text-xs font-medium">HCO Group by Patient</span>

        {selectedGrouping && (
          <span className="ml-2 text-[10px] text-blue-600">(Click on selected bar to clear filter)</span>
        )}
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={segmentData} margin={{ top: 10, right: 30, left: -25, bottom: 10 }}>
          <XAxis type="number" tick={{ fontSize: 10 }} hide />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={110} />
          <Tooltip wrapperStyle={{ fontSize: "10px" }} formatter={(value) => [`${value} patients`, "Volume"]} />
          <Bar dataKey="value" radius={[0, 8, 8, 0]} onClick={handleBarClick} cursor="pointer">
            {segmentData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isSelected ? selectedColor : colors[0]}
                stroke={entry.isSelected ? "#000" : "none"}
                strokeWidth={entry.isSelected ? 1 : 0}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default HCOchart
