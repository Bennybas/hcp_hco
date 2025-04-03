"use client"

import { useState, useEffect } from "react"
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps"
import { scaleLinear } from "d3-scale"
import axios from "axios"

// State name to abbreviation mapping
const STATE_MAPPING = {
  ALABAMA: "AL",
  ALASKA: "AK",
  ARIZONA: "AZ",
  ARKANSAS: "AR",
  CALIFORNIA: "CA",
  COLORADO: "CO",
  CONNECTICUT: "CT",
  DELAWARE: "DE",
  FLORIDA: "FL",
  GEORGIA: "GA",
  HAWAII: "HI",
  IDAHO: "ID",
  ILLINOIS: "IL",
  INDIANA: "IN",
  IOWA: "IA",
  KANSAS: "KS",
  KENTUCKY: "KY",
  LOUISIANA: "LA",
  MAINE: "ME",
  MARYLAND: "MD",
  MASSACHUSETTS: "MA",
  MICHIGAN: "MI",
  MINNESOTA: "MN",
  MISSISSIPPI: "MS",
  MISSOURI: "MO",
  MONTANA: "MT",
  NEBRASKA: "NE",
  NEVADA: "NV",
  "NEW HAMPSHIRE": "NH",
  "NEW JERSEY": "NJ",
  "NEW MEXICO": "NM",
  "NEW YORK": "NY",
  "NORTH CAROLINA": "NC",
  "NORTH DAKOTA": "ND",
  OHIO: "OH",
  OKLAHOMA: "OK",
  OREGON: "OR",
  PENNSYLVANIA: "PA",
  "RHODE ISLAND": "RI",
  "SOUTH CAROLINA": "SC",
  "SOUTH DAKOTA": "SD",
  TENNESSEE: "TN",
  TEXAS: "TX",
  UTAH: "UT",
  VERMONT: "VT",
  VIRGINIA: "VA",
  WASHINGTON: "WA",
  "WEST VIRGINIA": "WV",
  WISCONSIN: "WI",
  WYOMING: "WY",
  "DISTRICT OF COLUMBIA": "DC",
}

// Create reverse mapping from abbreviation to full name
const ABBR_TO_STATE = Object.entries(STATE_MAPPING).reduce((acc, [fullName, abbr]) => {
  acc[abbr] = fullName
  return acc
}, {})

// FIPS code to state abbreviation mapping
const FIPS_TO_ABBR = {
  "01": "AL",
  "02": "AK",
  "04": "AZ",
  "05": "AR",
  "06": "CA",
  "08": "CO",
  "09": "CT",
  10: "DE",
  11: "DC",
  12: "FL",
  13: "GA",
  15: "HI",
  16: "ID",
  17: "IL",
  18: "IN",
  19: "IA",
  20: "KS",
  21: "KY",
  22: "LA",
  23: "ME",
  24: "MD",
  25: "MA",
  26: "MI",
  27: "MN",
  28: "MS",
  29: "MO",
  30: "MT",
  31: "NE",
  32: "NV",
  33: "NH",
  34: "NJ",
  35: "NM",
  36: "NY",
  37: "NC",
  38: "ND",
  39: "OH",
  40: "OK",
  41: "OR",
  42: "PA",
  44: "RI",
  45: "SC",
  46: "SD",
  47: "TN",
  48: "TX",
  49: "UT",
  50: "VT",
  51: "VA",
  53: "WA",
  54: "WV",
  55: "WI",
  56: "WY",
}

// Create a reverse mapping from state abbreviation to FIPS code
const ABBR_TO_FIPS = Object.entries(FIPS_TO_ABBR).reduce((acc, [fips, abbr]) => {
  acc[abbr] = fips
  return acc
}, {})

// Color scales for the choropleth map
const COLOR_SCALES = {
  hcp: {
    high: "#004567", // Dark blue for high counts
    low: "#4f93c0", // Light blue for low counts
    noData: "#f3f4f6", // Light gray for no data
  },
  hco: {
    high: "#065f46", // Dark green for high counts
    low: "#34d399", // Light green for low counts
    noData: "#f3f4f6", // Light gray for no data
  },
}

// State centroids for placing markers and labels
const STATE_CENTROIDS = {
  AL: [-86.7911, 32.7794],
  AK: [-152.2782, 61.385],
  AZ: [-111.6602, 34.2744],
  AR: [-92.4426, 34.8938],
  CA: [-119.4696, 37.1841],
  CO: [-105.5478, 38.9972],
  CT: [-72.7622, 41.6219],
  DE: [-75.5276, 38.9896],
  FL: [-82.4497, 28.6305],
  GA: [-83.4426, 32.6415],
  HI: [-156.3737, 20.2927],
  ID: [-114.613, 43.6447],
  IL: [-89.1965, 40.0417],
  IN: [-86.2604, 39.8874],
  IA: [-93.496, 42.0751],
  KS: [-98.3804, 38.4937],
  KY: [-85.3021, 37.5347],
  LA: [-92.4451, 31.106],
  ME: [-69.2428, 45.3695],
  MD: [-76.7909, 39.055],
  MA: [-71.5314, 42.2373],
  MI: [-84.687, 43.6212],
  MN: [-94.3053, 45.9196],
  MS: [-89.7309, 32.7364],
  MO: [-92.458, 38.3566],
  MT: [-109.6333, 46.88],
  NE: [-99.8018, 41.5378],
  NV: [-116.6312, 39.3289],
  NH: [-71.5811, 43.6805],
  NJ: [-74.6728, 40.1907],
  NM: [-106.1126, 34.4071],
  NY: [-75.5268, 42.9538],
  NC: [-79.3877, 35.5557],
  ND: [-100.4659, 47.4501],
  OH: [-82.7937, 40.2862],
  OK: [-97.4943, 35.5889],
  OR: [-120.5583, 43.9336],
  PA: [-77.7996, 40.8781],
  RI: [-71.5562, 41.6762],
  SC: [-80.9066, 33.9169],
  SD: [-100.2263, 44.4443],
  TN: [-86.3505, 35.859],
  TX: [-99.3312, 31.4757],
  UT: [-111.6703, 39.3055],
  VT: [-72.6658, 44.0687],
  VA: [-78.6569, 37.5215],
  WA: [-120.4472, 47.3826],
  WV: [-80.9696, 38.6409],
  WI: [-89.9941, 44.6243],
  WY: [-107.5512, 42.9957],
  DC: [-77.0147, 38.9101],
}

const USAMap = ({ setSelectedStateName }) => {
  const [data, setData] = useState([])
  const [healthcareData, setHealthcareData] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedState, setSelectedState] = useState(null)
  const [hoveredState, setHoveredState] = useState(null)
  const [maxHcpCount, setMaxHcpCount] = useState(0)
  const [maxPatientCount, setMaxPatientCount] = useState(0)
  const [maxHcoCount, setMaxHcoCount] = useState(0)
  const [activeView, setActiveView] = useState("HCP") // Default view is HCP

  const buttons = [{ title: "HCP" }, { title: "HCO" }]

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      try {
        // Use the correct API endpoint
        const response = await axios.get("http://127.0.0.1:5000/fetch-map-data")
        console.log("API Response sample:", response.data.slice(0, 2)) // Debug log

        if (isMounted) {
          if (response.data && Array.isArray(response.data)) {
            // Process the data
            const processedData = processData(response.data)
            setData(processedData.rawData)
            setHealthcareData(processedData.healthcareData)
            setMaxHcpCount(processedData.maxHcpCount)
            setMaxPatientCount(processedData.maxPatientCount)
            setMaxHcoCount(processedData.maxHcoCount)
          } else {
            setError("Invalid data format received from API")
          }
          setLoading(false)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        setError(`Error fetching data: ${error.message}`)
        setLoading(false)
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [])

  // Process data for both HCP and HCO views
  const processData = (rawData) => {
    console.log("Processing data...")

    // Initialize state data with all states
    const stateData = {}

    // Initialize all states with zero counts
    Object.keys(STATE_MAPPING).forEach((stateName) => {
      const stateAbbr = STATE_MAPPING[stateName]
      stateData[stateAbbr] = {
        state: stateAbbr,
        stateName,
        hcpCount: 0,
        patientCount: 0,
        hcoCount: 0,
        drugData: {},
        ageGroups: {},
        specialties: {},
        hcps: new Set(),
        patients: new Set(),
        hcos: new Set(),
        coordinates: STATE_CENTROIDS[stateAbbr] || [-95, 37], // Default to center of US if not found
      }
    })

    // Track unique entities across all states
    const allHcps = new Set()
    const allPatients = new Set()
    const allHcos = new Set()

    // Process data
    rawData.forEach((item) => {
      // Skip invalid items
      if (!item) return

      // Debug log for a sample item
      if (rawData.indexOf(item) === 0) {
        console.log("Sample data item:", item)
      }

      // Get state from hcp_state
      if (item.hcp_state) {
        const hcpState = item.hcp_state

        // Check if the state is valid
        if (stateData[hcpState]) {
          // Count unique HCPs
          if (item.hcp_name) {
            stateData[hcpState].hcps.add(item.hcp_name)
            allHcps.add(item.hcp_name)
          }

          // Count unique patients for HCP state
          if (item.patient_id) {
            stateData[hcpState].patients.add(item.patient_id)
            allPatients.add(item.patient_id)
          }

          // Count HCOs
          if (item.hco_mdm) {
            stateData[hcpState].hcos.add(item.hco_mdm)
            allHcos.add(item.hco_mdm)
          }
        } else {
          console.warn(`Invalid hcp_state: ${hcpState}`)
        }
      }
    })

    // Convert sets to counts
    Object.values(stateData).forEach((state) => {
      state.hcpCount = state.hcps.size
      state.patientCount = state.patients.size
      state.hcoCount = state.hcos.size
    })

    // Log state data for debugging
    console.log("Total unique HCPs:", allHcps.size)
    console.log("Total unique patients:", allPatients.size)
    console.log("Total unique HCOs:", allHcos.size)

    // Find maximum counts
    const maxHcpCount = Math.max(...Object.values(stateData).map((state) => state.hcpCount), 1)
    const maxPatientCount = Math.max(...Object.values(stateData).map((state) => state.patientCount), 1)
    const maxHcoCount = Math.max(...Object.values(stateData).map((state) => state.hcoCount), 1)

    console.log("Max HCP Count:", maxHcpCount)
    console.log("Max Patient Count:", maxPatientCount)
    console.log("Max HCO Count:", maxHcoCount)

    // Create healthcare data object in the format needed for the map
    const healthcareData = {}

    // Convert from state abbreviation to FIPS code format
    Object.entries(stateData).forEach(([stateAbbr, state]) => {
      const fipsCode = ABBR_TO_FIPS[stateAbbr]
      if (fipsCode) {
        healthcareData[fipsCode] = {
          abbr: stateAbbr,
          patients: state.patientCount,
          hcps: state.hcpCount,
          hcos: state.hcoCount,
          // Calculate adoption rates as a percentage of the max (for visualization)
          hcpAdoptionRate: Math.round((state.hcpCount / maxHcpCount) * 100),
          hcoAdoptionRate: Math.round((state.hcoCount / maxHcoCount) * 100),
          drugData: state.drugData,
          ageGroups: state.ageGroups,
          specialties: state.specialties,
        }
      }
    })

    return {
      rawData,
      stateData,
      healthcareData,
      maxHcpCount,
      maxPatientCount,
      maxHcoCount,
    }
  }

  // Get patient visualization size
  const getPatientVisualizationSize = (count) => {
    // Create a scale from 0 to max patient count, resulting in sizes from 0 to 30
    return scaleLinear().domain([0, maxPatientCount]).range([0, 30])(count)
  }

  // Handle state click
  const handleStateClick = (geo) => {
    const fipsCode = geo.id
    const stateAbbr = FIPS_TO_ABBR[fipsCode]

    if (stateAbbr) {
      const stateData = healthcareData[fipsCode]

      if (stateData) {
        const newSelectedState =
          selectedState && selectedState.abbr === stateAbbr
            ? null
            : {
                ...stateData,
                stateName: ABBR_TO_STATE[stateAbbr],
                state: stateAbbr,
                coordinates: STATE_CENTROIDS[stateAbbr],
              }

        setSelectedState(newSelectedState)

        // Add this line to pass the state name to the parent component
        if (setSelectedStateName) {
          setSelectedStateName(newSelectedState ? newSelectedState.stateName : null)
        }
      }
    }
  }

  // Handle state hover
  const handleStateHover = (geo) => {
    const fipsCode = geo.id
    const stateAbbr = FIPS_TO_ABBR[fipsCode]

    if (stateAbbr) {
      const stateData = healthcareData[fipsCode]

      if (stateData) {
        setHoveredState({
          ...stateData,
          stateName: ABBR_TO_STATE[stateAbbr],
          state: stateAbbr,
          coordinates: STATE_CENTROIDS[stateAbbr],
        })
      }
    }
  }

  // Handle state hover exit
  const handleStateHoverExit = () => {
    setHoveredState(null)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {buttons.map((button, i) => (
          <button
            key={i}
            className={`flex text-[12px] rounded-xl ${activeView === button.title ? "bg-[#004567]" : "bg-gray-300"} text-white py-1 px-2`}
            onClick={() => setActiveView(button.title)}
          >
            {button.title}
          </button>
        ))}
      </div>

      <div>
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2">Loading data...</span>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <p className="text-lg text-red-600">Error loading data</p>
              <p className="text-sm text-gray-500 mt-2">{error}</p>
              <button
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <div className="relative">
            <ComposableMap projection="geoAlbersUsa" className="w-full h-[500px]">
              <Geographies geography="https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json">
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const stateData = healthcareData[geo.id] || {}
                    const threshold = 70 // Threshold for high/low color
                    const isHcpView = activeView === "HCP"
                    const colorScale = isHcpView ? COLOR_SCALES.hcp : COLOR_SCALES.hco
                    const adoptionRate = isHcpView ? stateData.hcpAdoptionRate : stateData.hcoAdoptionRate
                    const hasData = isHcpView ? stateData.hcps > 0 : stateData.hcos > 0

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={
                          hasData ? (adoptionRate > threshold ? colorScale.high : colorScale.low) : colorScale.noData
                        }
                        stroke="#FFFFFF"
                        strokeWidth={0.5}
                        style={{
                          default: { outline: "none" },
                          hover: { outline: "none", fill: isHcpView ? "#0d4a8f" : "#047857" },
                          pressed: { outline: "none" },
                        }}
                        onClick={() => handleStateClick(geo)}
                        onMouseEnter={() => handleStateHover(geo)}
                        onMouseLeave={handleStateHoverExit}
                      />
                    )
                  })
                }
              </Geographies>

              {/* Patient Count Visualization - Using Diamond Shapes */}
              {Object.entries(healthcareData)
                .filter(([_, state]) => state.patients > 0)
                .map(([fipsCode, state]) => {
                  const stateAbbr = state.abbr
                  const coordinates = STATE_CENTROIDS[stateAbbr]
                  if (!coordinates) return null

                  const size = getPatientVisualizationSize(state.patients)
                  return (
                    <Marker key={`patient-${stateAbbr}`} coordinates={coordinates}>
                      {/* Diamond shape for patient count */}
                      <g transform={`rotate(45)`}>
                        <rect
                          x={-size / 2}
                          y={-size / 2}
                          width={size}
                          height={size}
                          fill="#e11d48"
                          stroke="#fff"
                          strokeWidth={1}
                          opacity={0.7}
                        />
                      </g>
                      {size > 15 && (
                        <text
                          textAnchor="middle"
                          y={4}
                          style={{
                            fontFamily: "Arial",
                            fontSize: "8px",
                            fontWeight: "bold",
                            fill: "#fff",
                            pointerEvents: "none",
                          }}
                        >
                          {state.patients}
                        </text>
                      )}
                    </Marker>
                  )
                })}

              {/* Hover State Label */}
              {hoveredState && (
                <Marker coordinates={hoveredState.coordinates}>
                  <foreignObject x={-50} y={-40} width={100} height={40} style={{ overflow: "visible" }}>
                    <div className="bg-white px-2 py-1 rounded shadow text-center border border-gray-200">
                      <div className="font-bold text-sm">{hoveredState.state}</div>
                      <div className="text-xs flex justify-between">
                        <span>
                          {activeView === "HCP" ? "HCPs:" : "HCOs:"}{" "}
                          {activeView === "HCP" ? hoveredState.hcps : hoveredState.hcos}
                        </span>
                        <span>Patients: {hoveredState.patients}</span>
                      </div>
                    </div>
                  </foreignObject>
                </Marker>
              )}
            </ComposableMap>
          </div>
        )}
      </div>

      {/* Selected State Analytics */}
      {selectedState && (
        <div className="flex flex-col w-full bg-white rounded-xl p-2 gap-2 -mt-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-[14px] font-semibold">State level analytics</h3>
            <p className="text-[12px] text-gray-500">
              {selectedState.stateName} ({selectedState.state})
            </p>
          </div>
          <div className="w-full h-full bg-blue-100 rounded-xl p-3">
            <h4 className="text-[12px] font-medium text-gray-800 mb-2">Healthcare Providers</h4>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-2xl font-bold text-blue-800">{selectedState.hcps}</p>
                <p className="text-[10px] text-blue-600">{selectedState.hcpAdoptionRate}% of max</p>
              </div>
              <div className="text-[10px] text-gray-600">
                {activeView === "HCP"
                  ? `This state has ${selectedState.hcpAdoptionRate > 70 ? "high" : "low"} HCP adoption`
                  : `Switch to HCP view for more details`}
              </div>
            </div>
          </div>
          <div className="w-full h-full bg-green-100 rounded-xl p-3">
            <h4 className="text-[12px] font-mediumtext-gray-800 mb-2">Healthcare Organizations</h4>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-2xl font-bold text-green-800">{selectedState.hcos}</p>
                <p className="text-[10px] text-green-600">{selectedState.hcoAdoptionRate}% of max</p>
              </div>
              <div className="text-[10px] text-gray-600">
                {activeView === "HCO"
                  ? `This state has ${selectedState.hcoAdoptionRate > 70 ? "high" : "low"} HCO adoption`
                  : `Switch to HCO view for more details`}
              </div>
            </div>
          </div>
          <div className="w-full h-full bg-gray-100 rounded-xl p-3">
            <h4 className="text-[12px] font-mediumtext-gray-800 mb-2">Patients</h4>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-2xl font-bold text-red-800">{selectedState.patients}</p>
                <p className="text-[10px] text-red-600">
                  {((selectedState.patients / maxPatientCount) * 100).toFixed(1)}% of max
                </p>
              </div>
              <div className="text-[10px] text-gray-600">Patient distribution shown as red diamonds on map</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default USAMap