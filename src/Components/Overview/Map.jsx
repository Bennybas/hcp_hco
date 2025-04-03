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

// Color scales for the choropleth map - FIXED COLORS FOR BETTER VISIBILITY
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

const USAMap = ({ setSelectedStateName, onStateSelect }) => {
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

  // Generate sample data for testing
  const generateSampleData = () => {
    const sampleData = []
    const states = Object.keys(STATE_MAPPING)
    const drugs = ["SPINRAZA", "ZOLGENSMA", "EVRYSDI"]
    const ageGroups = ["0 to 2", "3 to 17", "Above 18"]
    const specialties = ["CHILD NEUROLOGY", "PEDIATRIC", "NEUROLOGY", "NEUROMUSCULAR", "NP/PA", "RADIOLOGY"]
    const segments = ["HIGH", "MEDIUM", "LOW", "V-LOW"]

    // Generate different amounts of data for different states to create variation
    states.forEach((state) => {
      const stateAbbr = STATE_MAPPING[state]
      // Random number of records for this state (more for some states, less for others)
      const recordCount = Math.floor(Math.random() * 50) + 5

      for (let i = 0; i < recordCount; i++) {
        const hcoMdm = `HCO_${Math.floor(Math.random() * 1000)}`
        const hcoName = `Healthcare Org ${Math.floor(Math.random() * 100)}`
        const refNpi = Math.random() > 0.5 ? `REF_${Math.floor(Math.random() * 1000)}` : "-"
        const refHcoNpiMdm = Math.random() > 0.5 ? `REF_HCO_${Math.floor(Math.random() * 1000)}` : "-"

        sampleData.push({
          hcp_id: `HCP_${stateAbbr}_${i}`,
          hcp_name: `Doctor ${Math.floor(Math.random() * 100)}`,
          hcp_state: stateAbbr,
          hcp_segment: segments[Math.floor(Math.random() * segments.length)],
          patient_id: `PATIENT_${stateAbbr}_${i}`,
          drug_name: drugs[Math.floor(Math.random() * drugs.length)],
          age_group: ageGroups[Math.floor(Math.random() * ageGroups.length)],
          final_spec: specialties[Math.floor(Math.random() * specialties.length)],
          hco_mdm: hcoMdm,
          hco_mdm_name: hcoName,
          ref_npi: refNpi,
          ref_hco_npi_mdm: refHcoNpiMdm,
        })
      }
    })

    return sampleData
  }

  const loadSampleData = () => {
    const sampleData = generateSampleData()
    console.log("Using sample data:", sampleData.slice(0, 2)) // Log first two items
    const processedData = processData(sampleData)
    setData(sampleData)
    setHealthcareData(processedData.healthcareData)
    setMaxHcpCount(processedData.maxHcpCount)
    setMaxPatientCount(processedData.maxPatientCount)
    setMaxHcoCount(processedData.maxHcoCount)
    setLoading(false)
  }

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      try {
        // Use axios to handle NaN values better
        const response = await axios.get("https://hcp-hco-backend.onrender.com/fetch-map-data", {
          transformResponse: [
            (data) => {
              // Replace NaN with null before parsing JSON
              const cleanedData = data.replace(/: NaN/g, ": null")
              try {
                return JSON.parse(cleanedData)
              } catch (e) {
                console.error("Error parsing JSON:", e)
                return data
              }
            },
          ],
        })

        if (!isMounted) return

        const jsonData = response.data

        // Validate the data
        if (!jsonData || !Array.isArray(jsonData)) {
          console.error("Invalid data format:", jsonData)
          setError("Invalid data format received from API")
          loadSampleData()
          return
        }

        // Check if the array is empty
        if (jsonData.length === 0) {
          console.error("Empty data array received")
          setError("No data received from API")
          loadSampleData()
          return
        }

        // Log a sample of the data for debugging
        console.log("API Response sample:", jsonData.slice(0, 2))

        // Process the data
        const processedData = processData(jsonData)
        setData(jsonData)
        setHealthcareData(processedData.healthcareData)
        setMaxHcpCount(processedData.maxHcpCount)
        setMaxPatientCount(processedData.maxPatientCount)
        setMaxHcoCount(processedData.maxHcoCount)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching data:", error)
        setError(`Error fetching data: ${error.message}`)
        loadSampleData()
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
        coordinates: STATE_CENTROIDS[stateAbbr] || [-95, 37], // Default to center of US if not found
      }
    })

    // Group data by state for more efficient processing
    const dataByState = {}
    Object.keys(STATE_MAPPING).forEach((stateName) => {
      const stateAbbr = STATE_MAPPING[stateName]
      dataByState[stateAbbr] = rawData.filter(item => item && item.hcp_state === stateAbbr)
    })

    // Calculate HCP and HCO counts for each state
    Object.keys(dataByState).forEach((stateAbbr) => {
      const stateItems = dataByState[stateAbbr]
      
      // Count patients
      stateData[stateAbbr].patientCount = stateItems.filter(item => item.patient_id).length
      
      // For HCPs: Count unique values from both hcp_id and ref_npi
      const uniqueHcpIds = new Set()
      const uniqueRefNpis = new Set()
      
      stateItems.forEach(item => {
        if (item.hcp_id && item.hcp_id !== "-") uniqueHcpIds.add(item.hcp_id)
        if (item.ref_npi && item.ref_npi !== "-") uniqueRefNpis.add(item.ref_npi)
      })
      
      // Combine both sets to get unique HCPs
      const allHcpIds = [...uniqueHcpIds, ...uniqueRefNpis]
      const uniqueHcps = new Set(allHcpIds)
      stateData[stateAbbr].hcpCount = uniqueHcps.size
      
      // For HCOs: Count unique values from both hco_mdm and ref_hco_npi_mdm
      const uniqueHcoMdms = new Set()
      const uniqueRefHcoNpiMdms = new Set()
      
      stateItems.forEach(item => {
        if (item.hco_mdm && item.hco_mdm !== "-") uniqueHcoMdms.add(item.hco_mdm)
        if (item.ref_hco_npi_mdm && item.ref_hco_npi_mdm !== "-") uniqueRefHcoNpiMdms.add(item.ref_hco_npi_mdm)
      })
      
      // Combine both sets to get unique HCOs
      const allHcoIds = [...uniqueHcoMdms, ...uniqueRefHcoNpiMdms]
      const uniqueHcos = new Set(allHcoIds)
      stateData[stateAbbr].hcoCount = uniqueHcos.size
    })

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
          hcpAdoptionRate: maxHcpCount > 0 ? Math.round((state.hcpCount / maxHcpCount) * 100) : 0,
          hcoAdoptionRate: maxHcoCount > 0 ? Math.round((state.hcoCount / maxHcoCount) * 100) : 0,
          drugData: state.drugData,
          ageGroups: state.ageGroups,
          specialties: state.specialties,
        }
      }
    })

    // Force some data for testing if no data was found
    if (maxHcpCount <= 1 && maxPatientCount <= 1 && maxHcoCount <= 1) {
      console.warn("No significant data found, adding test data")

      // Add test data to a few states
      const testStates = [
        { fips: "36", abbr: "NY", hcps: 241, patients: 672, hcos: 120 },
        { fips: "06", abbr: "CA", hcps: 264, patients: 873, hcos: 132 },
        { fips: "48", abbr: "TX", hcps: 283, patients: 812, hcos: 141 },
        { fips: "12", abbr: "FL", hcps: 221, patients: 640, hcos: 110 },
        { fips: "17", abbr: "IL", hcps: 136, patients: 391, hcos: 68 },
      ]

      testStates.forEach((state) => {
        healthcareData[state.fips] = {
          abbr: state.abbr,
          patients: state.patients,
          hcps: state.hcps,
          hcos: state.hcos,
          hcpAdoptionRate: Math.round((state.hcps / 283) * 100), // 283 is max HCP count in test data
          hcoAdoptionRate: Math.round((state.hcos / 141) * 100), // 141 is max HCO count in test data
          drugData: {},
          ageGroups: {},
          specialties: {},
        }

        if (stateData[state.abbr]) {
          stateData[state.abbr].hcpCount = state.hcps
          stateData[state.abbr].patientCount = state.patients
          stateData[state.abbr].hcoCount = state.hcos
        }
      })

      // Recalculate max counts
      const newMaxHcpCount = Math.max(...Object.values(stateData).map((state) => state.hcpCount))
      const newMaxPatientCount = Math.max(...Object.values(stateData).map((state) => state.patientCount))
      const newMaxHcoCount = Math.max(...Object.values(stateData).map((state) => state.hcoCount))

      console.log("New Max HCP Count:", newMaxHcpCount)
      console.log("New Max Patient Count:", newMaxPatientCount)
      console.log("New Max HCO Count:", newMaxHcoCount)

      return {
        healthcareData,
        maxHcpCount: newMaxHcpCount,
        maxPatientCount: newMaxPatientCount,
        maxHcoCount: newMaxHcoCount,
      }
    }

    return {
      healthcareData,
      maxHcpCount,
      maxPatientCount,
      maxHcoCount,
    }
  }

  // Get patient visualization size
  const getPatientVisualizationSize = (count) => {
    // Create a scale from 0 to max patient count, resulting in sizes from 0 to 30
    return scaleLinear()
      .domain([0, maxPatientCount || 1])
      .range([0, 30])(count)
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

        // Pass the state name to the parent component
        if (setSelectedStateName) {
          setSelectedStateName(newSelectedState ? newSelectedState.stateName : null)
        }

        // Call the onStateSelect callback with the selected state data
        if (onStateSelect) {
          onStateSelect(newSelectedState ? stateAbbr : null)
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
                    const fipsCode = geo.id
                    const stateData = healthcareData[fipsCode] || {}
                    const isHcpView = activeView === "HCP"
                    
                    // Determine fill color based on active view
                    let fillColor = "#f3f4f6" // Default light gray for no data
                    
                    if (isHcpView) {
                      // HCP view - use blue colors
                      if (stateData.hcps && stateData.hcps > 0) {
                        fillColor = stateData.hcpAdoptionRate > 70 ? "#004567" : "#4f93c0"
                      }
                    } else {
                      // HCO view - use green colors
                      if (stateData.hcos && stateData.hcos > 0) {
                        fillColor = stateData.hcoAdoptionRate > 70 ? "#065f46" : "#34d399"
                      }
                    }
                    
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={fillColor}
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
              
              </div>
              <div className="text-[10px] text-gray-600">
                {activeView === "HCP"
                  ? `This state has ${selectedState.hcpAdoptionRate > 70 ? "high" : "low"} HCP adoption`
                  : `Switch to HCP view for more details`}
              </div>
            </div>
          </div>
          <div className="w-full h-full bg-green-100 rounded-xl p-3">
            <h4 className="text-[12px] font-medium text-gray-800 mb-2">Healthcare Organizations</h4>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-2xl font-bold text-green-800">{selectedState.hcos}</p>
              
              </div>
              <div className="text-[10px] text-gray-600">
                {activeView === "HCO"
                  ? `This state has ${selectedState.hcoAdoptionRate > 70 ? "high" : "low"} HCO adoption`
                  : `Switch to HCO view for more details`}
              </div>
            </div>
          </div>
          <div className="w-full h-full bg-gray-100 rounded-xl p-3">
            <h4 className="text-[12px] font-medium text-gray-800 mb-2">Patients</h4>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-2xl font-bold text-red-800">{selectedState.patients}</p>
               
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