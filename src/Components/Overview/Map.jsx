"use client"

import { useState, useEffect, useMemo } from "react"
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps"
import { scaleQuantile } from "d3-scale"
import { Tooltip } from "react-tooltip"

const geoUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"

const COLOR_RANGE_HCP = [
  "#d1faff",  // Lightest
  "#bbecef",
  "#a6dde0",
  "#90ced7",
  "#7bbfce",
  "#66afc6",
  "#51a0bd",
  "#3c8fb4",
  "#2780ab"   // Darkest
];


const COLOR_RANGE_HCO = [
  "#f0fff5",  // Lightest
  "#defee3",
  "#cbfdd0",
  "#b7f8bd",
  "#a3f2aa",
  "#8fe898",
  "#7ccf87",
  "#69b376",
  "#55a665"   // Darkest
];



// State abbreviations to full names mapping
const stateAbbreviationToName = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  DC: "District of Columbia",
}

// State names to abbreviations mapping
const stateNameToAbbreviation = Object.entries(stateAbbreviationToName).reduce((acc, [abbr, name]) => {
  acc[name] = abbr
  return acc
}, {})

const USAMap = ({ onStateSelect }) => {
  const [mapData, setMapData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tooltipContent, setTooltipContent] = useState("")
  const [selectedState, setSelectedState] = useState(null)
  const [viewType, setViewType] = useState("hcp") // 'hcp' or 'hco'

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch("https://hcp-hco-backend.onrender.com/fetch-map-data")
        if (!response.ok) {
          throw new Error("Network response was not ok")
        }
        const data = await response.json()
        setMapData(data)
      } catch (error) {
        console.error("Error fetching map data:", error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Process data to get unique HCP and HCO counts by state and ZIP
  const { hcpStateCounts, hcoStateCounts, patientStateCounts, hcpZipData, hcoZipData } = useMemo(() => {
    // Create unique sets for each state
    const hcpStateMap = new Map() // Map of state -> Set of unique HCP IDs
    const hcoStateMap = new Map() // Map of state -> Set of unique HCO IDs
    const patientStateMap = new Map() // Map of state -> Set of unique patient IDs

    // Maps for zip code level data
    const hcpZipMap = new Map() // Map of state-zip -> Set of unique HCP IDs
    const hcoZipMap = new Map() // Map of state-zip -> Set of unique HCO IDs

    // Process each record for HCP data
    mapData.forEach((record) => {
      const hcpId = record.hcp_id
      const hcoId = record.hco_mdm
      const patientId = record.patient_id
      const hcpState = record.hcp_state
      const hcoState = record.hco_state
      const hcpZip = record.hcp_zip
      const hcoZip = record.hco_postal_cd_prim

      // Process HCP data
      if (hcpId && hcpId !== "-" && hcpState && hcpState !== "-") {
        // State level counts
        if (!hcpStateMap.has(hcpState)) {
          hcpStateMap.set(hcpState, new Set())
        }
        hcpStateMap.get(hcpState).add(hcpId)

        // Add patient to state count
        if (patientId && patientId !== "-") {
          if (!patientStateMap.has(hcpState)) {
            patientStateMap.set(hcpState, new Set())
          }
          patientStateMap.get(hcpState).add(patientId)
        }

        // ZIP level counts
        if (hcpZip && hcpZip !== "-") {
          const zipKey = `${hcpState}-${hcpZip}`
          if (!hcpZipMap.has(zipKey)) {
            hcpZipMap.set(zipKey, {
              state: hcpState,
              zip: hcpZip,
              hcps: new Set(),
              patients: new Set(),
            })
          }
          hcpZipMap.get(zipKey).hcps.add(hcpId)
          if (patientId && patientId !== "-") {
            hcpZipMap.get(zipKey).patients.add(patientId)
          }
        }
      }

      // Process HCO data
      if (hcoId && hcoId !== "-" && hcoState && hcoState !== "-") {
        // State level counts
        if (!hcoStateMap.has(hcoState)) {
          hcoStateMap.set(hcoState, new Set())
        }
        hcoStateMap.get(hcoState).add(hcoId)

        // ZIP level counts
        if (hcoZip && hcoZip !== "-") {
          const zipKey = `${hcoState}-${hcoZip}`
          if (!hcoZipMap.has(zipKey)) {
            hcoZipMap.set(zipKey, {
              state: hcoState,
              zip: hcoZip,
              hcos: new Set(),
              patients: new Set(),
            })
          }
          hcoZipMap.get(zipKey).hcos.add(hcoId)
          if (patientId && patientId !== "-") {
            hcoZipMap.get(zipKey).patients.add(patientId)
          }
        }
      }
    })

    // Convert maps to count objects
    const hcpStateCounts = {}
    hcpStateMap.forEach((hcpSet, state) => {
      hcpStateCounts[state] = hcpSet.size
    })

    const hcoStateCounts = {}
    hcoStateMap.forEach((hcoSet, state) => {
      hcoStateCounts[state] = hcoSet.size
    })

    const patientStateCounts = {}
    patientStateMap.forEach((patientSet, state) => {
      patientStateCounts[state] = patientSet.size
    })

    // Convert zip maps to arrays of data
    const hcpZipData = Array.from(hcpZipMap.values()).map((item) => ({
      state: item.state,
      zip: item.zip,
      count: item.hcps.size,
      patientCount: item.patients.size,
    }))

    const hcoZipData = Array.from(hcoZipMap.values()).map((item) => ({
      state: item.state,
      zip: item.zip,
      count: item.hcos.size,
      patientCount: item.patients.size,
    }))

    return {
      hcpStateCounts,
      hcoStateCounts,
      patientStateCounts,
      hcpZipData,
      hcoZipData,
    }
  }, [mapData])

  // Create color scales based on data
  const colorScale = useMemo(() => {
    const stateCounts = viewType === "hcp" ? hcpStateCounts : hcoStateCounts
    const colorRange = viewType === "hcp" ? COLOR_RANGE_HCP : COLOR_RANGE_HCO

    // Get all values for the scale
    const values = Object.values(stateCounts).filter((val) => val > 0)

    if (values.length === 0) return () => colorRange[0]

    // Create a quantile scale
    return scaleQuantile().domain(values).range(colorRange)
  }, [hcpStateCounts, hcoStateCounts, viewType])

  // Get ZIP codes for selected state
  const selectedStateZips = useMemo(() => {
    if (!selectedState) return []

    const zipData = viewType === "hcp" ? hcpZipData : hcoZipData
    return zipData.filter((item) => item.state === selectedState).sort((a, b) => b.patientCount - a.patientCount) // Sort by patient count in descending order
  }, [selectedState, hcpZipData, hcoZipData, viewType])

  // Handle state selection
  const handleStateClick = (geo) => {
    const state = geo.properties.name
    const stateAbbr = stateNameToAbbreviation[state]

    if (stateAbbr) {
      // Toggle selection if clicking the same state
      if (selectedState === stateAbbr) {
        setSelectedState(null)
        if (onStateSelect) {
          onStateSelect(null) // Notify parent that selection was cleared
        }
      } else {
        setSelectedState(stateAbbr)
        if (onStateSelect) {
          onStateSelect(stateAbbr)
        }
      }
    }
  }

  // Toggle between HCP and HCO views
  const toggleViewType = (type) => {
    setViewType(type)
    setSelectedState(null) // Reset selected state when changing view
  }

  // Handle tooltip content
  const handleMouseEnter = (geo) => {
    const state = geo.properties.name
    const stateAbbr = stateNameToAbbreviation[state]

    if (stateAbbr) {
      const entityCount = viewType === "hcp" ? hcpStateCounts[stateAbbr] || 0 : hcoStateCounts[stateAbbr] || 0

      const patientCount = patientStateCounts[stateAbbr] || 0

      setTooltipContent(`${state}\n${viewType.toUpperCase()} `)
    }
  }

  const handleMouseLeave = () => {
    setTooltipContent("")
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        
      </div>
    )
  }

  if (error) {
    return <div className="text-red-500">Error loading map data: {error}</div>
  }

  return (
    <div className="flex flex-col gap-4 ">
      {/* Toggle buttons */}
      <div className="flex items-center gap-2">
        <div
          className={`flex ${viewType === "hcp" ? "bg-[#155675] text-white" : "bg-gray-200 text-gray-700"} text-[12px] p-1 rounded-lg cursor-pointer`}
          onClick={() => toggleViewType("hcp")}
        >
          HCP
        </div>
        <div
          className={`flex ${viewType === "hco" ? "bg-[#157545] text-white" : "bg-gray-200 text-gray-700"} text-[12px] p-1 rounded-lg cursor-pointer`}
          onClick={() => toggleViewType("hco")}
        >
          HCO
        </div>
      </div>

      {/* Map container */}
      <div className="relative bg-white rounded-xl">
        <ComposableMap projection="geoAlbersUsa" width={980} height={550} style={{ width: "100%", height: "auto" }}>
          <ZoomableGroup>
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const stateName = geo.properties.name
                  const stateAbbr = stateNameToAbbreviation[stateName]
                  const count = stateAbbr
                    ? viewType === "hcp"
                      ? hcpStateCounts[stateAbbr] || 0
                      : hcoStateCounts[stateAbbr] || 0
                    : 0
                  const isSelected = stateAbbr === selectedState

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={count > 0 ? colorScale(count) : "#EEE"}
                      stroke="#FFF"
                      strokeWidth={isSelected ? 1.5 : 0.5}
                      style={{
                        default: {
                          outline: "none",
                          stroke: "#FFF",
                          strokeWidth: isSelected ? 1.5 : 0.5,
                        },
                        hover: {
                          outline: "none",
                          stroke: "#000",
                          strokeWidth: 1,
                          cursor: "pointer",
                        },
                        pressed: {
                          outline: "none",
                          stroke: "#000",
                          strokeWidth: 1,
                        },
                      }}
                      onClick={() => handleStateClick(geo)}
                      onMouseEnter={() => handleMouseEnter(geo)}
                      data-tooltip-id="mapTooltip"
                    />
                  )
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

        {/* Legend */}
        <div className="absolute bottom-0 right-2 bg-white p-2 rounded-md shadow-md text-xs">
          <div className="flex items-center mb-1">
            <div className="mr-1 text-[10px]">Low</div>
            <div className="flex">
              {(viewType === "hcp" ? COLOR_RANGE_HCP : COLOR_RANGE_HCO).map((color, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: color,
                    width: "12px",
                    height: "12px",
                  }}
                />
              ))}
            </div>
            <div className="ml-1 text-[10px]">High</div>
          </div>
          <div className="text-[10px] text-center">{viewType === "hcp" ? "HCP Count" : "HCO Count"}</div>
        </div>
      </div>

      {/* Tooltip */}
      <Tooltip
        id="mapTooltip"
        content={tooltipContent}
        style={{
          backgroundColor: "white",
          color: "black",
          border: "1px solid #ccc",
          borderRadius: "4px",
          padding: "8px",
          zIndex: 1000,
        }}
      />

      {/* ZIP code data */}
      <div className="flex flex-wrap gap-2 w-full mt-8">
        {selectedState &&
          selectedStateZips.slice(0, 12).map((zipData, index) => (
            <div
              key={index}
              className={`flex ${viewType === "hcp" ? "bg-blue-100 text-[#004567]" : "bg-green-100 text-green-700"} w-[23%] h-8 rounded-xl text-[9px] p-[4px] items-center`}
            >
              <span>ZIP: <span className="font-[500]">{zipData.zip}</span></span>
              <div className="border-l border-gray-500 h-[15px] mx-2"></div>
              <span>Patients: <span className="font-[500]">{zipData.patientCount}</span></span>
            </div>
          ))}

        {!selectedState && <div className="text-gray-500 text-sm">Select a state to view ZIP code data</div>}
      </div>
    </div>
  )
}

export default USAMap