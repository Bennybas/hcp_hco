"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import "leaflet.markercluster"
import "leaflet.markercluster/dist/MarkerCluster.css"
import "leaflet.markercluster/dist/MarkerCluster.Default.css"
import { scaleQuantile } from "d3-scale"
import api from "../api/api"
import { useNavigate } from "react-router-dom"

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
  PR: "Puerto Rico",
}

const stateNameToAbbreviation = Object.entries(stateAbbreviationToName).reduce((acc, [abbr, name]) => {
  acc[name] = abbr
  return acc
}, {})

// Territory to states mapping - Keeping this for backward compatibility
const territoryToStates = {
  SOUTHEAST: ["SC", "GA", "PR", "NC", "FL"],
  MIDWEST: ["IN", "OK", "KS", "KY", "IL", "IA", "MO", "NE"],
  "NEW ENGLAND": ["CT", "PA", "MA", "RI", "NH", "ME", "NY", "VT"],
  "SOUTH CENTRAL": ["KY", "MS", "LA", "TN", "TX", "AL"],
  "UPPER MIDWEST": ["MN", "SD", "WI", "ND", "IL"],
  "OHIO VALLEY": ["OH", "MI"],
  CAPITOL: ["DC", "MD", "WV", "VA", "NJ", "PA", "DE"],
  TEXAS: ["AR", "TX", "MO"],
  "ROCKY MOUNTAIN": ["WY", "WA", "MT", "ID", "OR", "AK", "NM", "MO", "CO", "UT", "NV"],
  SOUTHWEST: ["HI", "CA", "AZ"],
}

// Create a reverse mapping from state to territory
const stateToTerritory = {}
Object.entries(territoryToStates).forEach(([territory, states]) => {
  states.forEach((state) => {
    if (!stateToTerritory[state]) {
      stateToTerritory[state] = []
    }
    stateToTerritory[state].push(territory)
  })
})

const COLOR_RANGE = [
  "#f7fbff", // Lightest
  "#e3eef9",
  "#cfe1f2",
  "#b5d4e9",
  "#93c3df",
  "#6daed5",
  "#4b97c9",
  "#2f7ebc",
  "#1864aa", // Darkest
]

// Approximate state centers for positioning and zooming
const stateCenters = {
  AL: [32.7794, -86.8287, 7],
  AK: [64.0685, -152.2782, 4],
  AZ: [34.2744, -111.6602, 6],
  AR: [34.8938, -92.4426, 7],
  CA: [37.1841, -119.4696, 6],
  CO: [38.9972, -105.5478, 7],
  CT: [41.6219, -72.7273, 8],
  DE: [38.9896, -75.505, 8],
  FL: [28.6305, -82.4497, 6],
  GA: [32.6415, -83.4426, 7],
  HI: [20.2927, -156.3737, 7],
  ID: [44.3509, -114.613, 6],
  IL: [40.0417, -89.1965, 6],
  IN: [39.8942, -86.2816, 7],
  IA: [42.0751, -93.496, 7],
  KS: [38.4937, -98.3804, 7],
  KY: [37.5347, -85.3021, 7],
  LA: [31.0689, -91.9968, 7],
  ME: [45.3695, -69.2428, 7],
  MD: [39.055, -76.7909, 7],
  MA: [42.2596, -71.8083, 8],
  MI: [44.3467, -85.4102, 6],
  MN: [46.2807, -94.3053, 6],
  MS: [32.7364, -89.6678, 7],
  MO: [38.3566, -92.458, 7],
  MT: [47.0527, -109.6333, 6],
  NE: [41.5378, -99.7951, 7],
  NV: [39.3289, -116.6312, 6],
  NH: [43.6805, -71.5811, 7],
  NJ: [40.1907, -74.6728, 7],
  NM: [34.4071, -106.1126, 6],
  NY: [42.9538, -75.5268, 7],
  NC: [35.5557, -79.3877, 7],
  ND: [47.4501, -100.4659, 7],
  OH: [40.2862, -82.7937, 7],
  OK: [35.5889, -97.4943, 7],
  OR: [43.9336, -120.5583, 6],
  PA: [40.8781, -77.7996, 7],
  RI: [41.6762, -71.5562, 9],
  SC: [33.9169, -80.8964, 7],
  SD: [44.4443, -100.2263, 7],
  TN: [35.858, -86.3505, 7],
  TX: [31.4757, -99.3312, 6],
  UT: [39.3055, -111.6703, 6],
  VT: [44.0687, -72.6658, 7],
  VA: [37.5215, -78.8537, 7],
  WA: [47.3826, -120.4472, 7],
  WV: [38.6409, -80.6227, 7],
  WI: [44.6243, -89.9941, 6],
  WY: [42.9957, -107.5512, 7],
  DC: [38.9101, -77.0147, 10],
  PR: [18.2208, -66.5901, 8],
}

// GeoJSON data for US states
const statesGeoJsonUrl = "https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json"

// HCO grouping colors mapping
const groupingColors = {
  "CURRENT IV": "#00B050", // Green
  "IV AFFILIATES": "#FFC100", // Yellow/Gold
  "NEW IT TREATMENT CENTERS": "#7030A0", // Purple
  "NEW TREATMENT CENTERS": "#FF585D", // Red
  Unspecified: "#CCCCCC", // Light gray for unspecified/missing values
}

const USAMap = ({
  onStateSelect,
  selectedState,
  selectedTerritories = [],
  selectedYears = [],
  selectedHcpSegment = null,
  selectedHcoGrouping = null,
}) => {
  const navigate = useNavigate()
  const [mapData, setMapData] = useState([])
  const [filteredMapData, setFilteredMapData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tooltipContent, setTooltipContent] = useState("")
  const [zipTooltipContent, setZipTooltipContent] = useState("")
  const [showAllZips, setShowAllZips] = useState(false)
  const mapContainerId = useRef(`leaflet-map-container-${Math.random().toString(36).substring(2, 9)}`)
  const mapInitializedRef = useRef(false)
  const mapMountedRef = useRef(false)
  const [territoryZipMapping, setTerritoryZipMapping] = useState({})

  // Refs for map and layers
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const stateLayerRef = useRef(null)
  const markerClusterRef = useRef(null)
  const geoJsonLoadedRef = useRef(false)
  const zipGeoJsonRef = useRef(null)
  const zipLayerRef = useRef(null)

  // Function to navigate to HCO details
  const getHCODetails = (hcoId) => {
    navigate("/hco", { state: { hco_id: hcoId } })
  }

  // Fetch ZIP to territory mapping from API
  useEffect(() => {
    const fetchTerritoryZips = async () => {
      try {
        const response = await fetch(`${api}/fetch-zip`)
        if (!response.ok) {
          throw new Error("Failed to fetch territory zip mapping")
        }
        const data = await response.json()

        // Process the data to create a mapping from ZIP to territory
        const zipToTerritoryMap = {}
        data.forEach((item) => {
          // Parse the zips from the string format "[00601, 00602, ...]"
          // to an actual array of strings
          const zips = JSON.parse(
            item.agg_zips
              .replace(/\[|\]/g, "")
              .split(",")
              .map((zip) => zip.trim()),
          )
          zips.forEach((zip) => {
            zipToTerritoryMap[zip] = item.territory_name
          })
        })

        setTerritoryZipMapping(zipToTerritoryMap)
        console.log("Loaded ZIP to territory mapping:", Object.keys(zipToTerritoryMap).length, "ZIP codes")
      } catch (error) {
        console.error("Error fetching territory zip mapping:", error)
        setError("Error fetching territory zip data: " + error.message)
      }
    }

    fetchTerritoryZips()
  }, [])

  // Load ZIP code GeoJSON data
  useEffect(() => {
    const fetchZipGeoJson = async () => {
      try {
        const response = await fetch("/usa_zip_codes_geo_15m.json")
        if (!response.ok) {
          throw new Error("Failed to load ZIP code GeoJSON")
        }
        const data = await response.json()
        zipGeoJsonRef.current = data
        console.log("Loaded ZIP GeoJSON with", data.features.length, "features")
      } catch (error) {
        console.error("Error loading ZIP GeoJSON:", error)
        setError("Error loading ZIP code map data: " + error.message)
      }
    }

    fetchZipGeoJson()
  }, [])

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${api}/fetch-map-data`)
        if (!response.ok) {
          throw new Error("Network response was not ok")
        }

        // Get the raw text first
        const rawText = await response.text()

        // Clean the JSON string by replacing NaN with null
        const cleanedText = rawText
          .replace(/:\s*NaN\s*([,}])/g, ": null$1")
          .replace(/:\s*"-"\s*([,}])/g, ": null$1")
          .replace(/:\s*"-\s*([,}])/g, ": null$1")

        // Parse the cleaned JSON
        const data = JSON.parse(cleanedText)

        // Further clean the data by filtering out invalid entries
        const cleanedData = data
          .filter((item) => {
            // Keep only items with valid data
            return (
              item &&
              (item.hcp_id !== "-" || item.hco_mdm !== "-") &&
              (item.hcp_state !== "-" || item.hco_state !== "-")
            )
          })
          .map((item) => {
            // Convert any remaining '-' to null for consistency
            const cleanItem = { ...item }
            Object.keys(cleanItem).forEach((key) => {
              if (cleanItem[key] === "-") {
                cleanItem[key] = null
              }
              // Ensure lat/long are numbers or null
              if (key === "rend_hco_lat" || key === "rend_hco_long") {
                cleanItem[key] = typeof cleanItem[key] === "number" && !isNaN(cleanItem[key]) ? cleanItem[key] : null
              }
            })
            return cleanItem
          })

        setMapData(cleanedData)
        setFilteredMapData(cleanedData)
      } catch (error) {
        console.error("Error fetching map data:", error)
        setError("Error fetching data: " + error.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Filter map data based on selected filters
  useEffect(() => {
    if (mapData.length === 0) return

    let filtered = [...mapData]

    // Apply state filter
    if (selectedState) {
      filtered = filtered.filter(
        (item) =>
          item.hcp_state === selectedState ||
          item.hco_state === selectedState ||
          item.ref_hcp_state === selectedState ||
          item.ref_hco_state === selectedState,
      )
    }

    // Apply year filter
    if (selectedYears && selectedYears.length > 0) {
      filtered = filtered.filter((item) => selectedYears.includes(item.year))
    }

    // Apply territory filter using ZIP codes
    if (selectedTerritories && selectedTerritories.length > 0 && Object.keys(territoryZipMapping).length > 0) {
      filtered = filtered.filter((item) => {
        // Get all ZIP codes from this record
        const zips = new Set()
        if (item.hcp_zip) zips.add(item.hcp_zip)
        if (item.hco_postal_cd_prim) zips.add(item.hco_postal_cd_prim)

        // Check if any of these ZIP codes belong to the selected territories
        for (const zip of zips) {
          const territory = territoryZipMapping[zip]
          if (territory && selectedTerritories.includes(territory)) {
            return true
          }
        }

        // Fallback to state-territory mapping for backward compatibility
        const states = new Set()
        if (item.hcp_state) states.add(item.hcp_state)
        if (item.hco_state) states.add(item.hco_state)
        if (item.ref_hcp_state) states.add(item.ref_hcp_state)
        if (item.ref_hco_state) states.add(item.ref_hco_state)

        for (const state of states) {
          const territories = stateToTerritory[state] || []
          if (territories.some((territory) => selectedTerritories.includes(territory))) {
            return true
          }
        }

        return false
      })
    }

    // Apply HCP segment filter
    if (selectedHcpSegment) {
      filtered = filtered.filter((item) => {
        const segment = item.hcp_segment ? item.hcp_segment.toUpperCase() : ""
        if (selectedHcpSegment === "HIGH") return segment === "HIGH"
        if (selectedHcpSegment === "MEDIUM") return ["MODERATE", "MEDIUM", "MED"].includes(segment)
        if (selectedHcpSegment === "LOW") return segment === "LOW"
        if (selectedHcpSegment === "V-LOW") return ["VERY LOW", "V. LOW", "V.LOW", "V-LOW"].includes(segment)
        return false
      })
    }

    // Apply HCO grouping filter
    if (selectedHcoGrouping) {
      filtered = filtered.filter((item) => {
        const grouping = item.hco_grouping ? item.hco_grouping.replace(/-/g, "").trim().toUpperCase() : ""
        return (
          grouping === selectedHcoGrouping ||
          (selectedHcoGrouping === "UNSPECIFIED" && (grouping === "DELETE" || grouping === ""))
        )
      })
    }

    setFilteredMapData(filtered)
  }, [
    mapData,
    selectedState,
    selectedYears,
    selectedTerritories,
    selectedHcpSegment,
    selectedHcoGrouping,
    territoryZipMapping,
  ])

  // Calculate states in selected territories
  const statesInSelectedTerritories = useMemo(() => {
    const states = new Set()
    if (selectedTerritories && selectedTerritories.length > 0) {
      Object.entries(territoryToStates).forEach(([territory, stateList]) => {
        if (selectedTerritories.includes(territory)) {
          stateList.forEach((state) => states.add(state))
        }
      })
    }
    return states
  }, [selectedTerritories])

  // Get ZIP codes that belong to selected territories
  const zipsInSelectedTerritories = useMemo(() => {
    if (!selectedTerritories || selectedTerritories.length === 0 || Object.keys(territoryZipMapping).length === 0) {
      return new Set()
    }

    const zipSet = new Set()

    // Add all ZIP codes that belong to the selected territories
    Object.entries(territoryZipMapping).forEach(([zip, territory]) => {
      if (selectedTerritories.includes(territory)) {
        zipSet.add(zip)
      }
    })

    return zipSet
  }, [selectedTerritories, territoryZipMapping])

  // Process data to get counts by state
  const { hcpStateCounts, hcoStateCounts, patientStateCounts, hcpZipData, hcoZipData, locationData } = useMemo(() => {
    // Create unique sets for each state
    const hcpStateMap = new Map() // Map of state -> Set of unique HCP IDs
    const hcoStateMap = new Map() // Map of state -> Set of unique HCO IDs
    const patientStateMap = new Map() // Map of state -> Set of unique patient IDs

    // Maps for zip code level data
    const hcpZipMap = new Map() // Map of state-zip -> Set of unique HCP IDs
    const hcoZipMap = new Map() // Map of state-zip -> Set of unique HCO IDs

    // Map for location data (lat/long)
    const locationMap = new Map() // Map of state -> Array of location objects

    // Process each record using UNION logic
    filteredMapData.forEach((record) => {
      // Process rendering HCP data
      if (record.hcp_id && record.hcp_state && record.hcp_id !== "-" && record.hcp_state !== "-") {
        // State level counts
        if (!hcpStateMap.has(record.hcp_state)) {
          hcpStateMap.set(record.hcp_state, new Set())
        }
        hcpStateMap.get(record.hcp_state).add(record.hcp_id)

        // Add patient to state count
        if (record.patient_id && record.patient_id !== "-") {
          if (!patientStateMap.has(record.hcp_state)) {
            patientStateMap.set(record.hcp_state, new Set())
          }
          patientStateMap.get(record.hcp_state).add(record.patient_id)
        }

        // ZIP level counts
        if (record.hcp_zip && record.hcp_zip !== "-") {
          const zipKey = `${record.hcp_state}-${record.hcp_zip}`
          if (!hcpZipMap.has(zipKey)) {
            hcpZipMap.set(zipKey, {
              state: record.hcp_state,
              zip: record.hcp_zip,
              hcps: new Set(),
              patients: new Set(),
            })
          }
          hcpZipMap.get(zipKey).hcps.add(record.hcp_id)
          if (record.patient_id && record.patient_id !== "-") {
            hcpZipMap.get(zipKey).patients.add(record.patient_id)
          }
        }
      }

      // Process referring HCP data
      if (record.ref_npi && record.ref_hcp_state && record.ref_npi !== "-" && record.ref_hcp_state !== "-") {
        // State level counts
        if (!hcpStateMap.has(record.ref_hcp_state)) {
          hcpStateMap.set(record.ref_hcp_state, new Set())
        }
        hcpStateMap.get(record.ref_hcp_state).add(record.ref_npi)

        // Add patient to state count
        if (record.patient_id && record.patient_id !== "-") {
          if (!patientStateMap.has(record.ref_hcp_state)) {
            patientStateMap.set(record.ref_hcp_state, new Set())
          }
          patientStateMap.get(record.ref_hcp_state).add(record.patient_id)
        }
      }

      // Process rendering HCO data
      if (record.hco_mdm && record.hco_state && record.hco_mdm !== "-" && record.hco_state !== "-") {
        // State level counts
        if (!hcoStateMap.has(record.hco_state)) {
          hcoStateMap.set(record.hco_state, new Set())
        }
        hcoStateMap.get(record.hco_state).add(record.hco_mdm)

        // ZIP level counts
        if (record.hco_postal_cd_prim && record.hco_postal_cd_prim !== "-") {
          const zipKey = `${record.hco_state}-${record.hco_postal_cd_prim}`
          if (!hcoZipMap.has(zipKey)) {
            hcoZipMap.set(zipKey, {
              state: record.hco_state,
              zip: record.hco_postal_cd_prim,
              hcos: new Set(),
              patients: new Set(),
            })
          }
          hcoZipMap.get(zipKey).hcos.add(record.hco_mdm)
          if (record.patient_id && record.patient_id !== "-") {
            hcoZipMap.get(zipKey).patients.add(record.patient_id)
          }
        }

        // Process location data if lat/long are available
        const hcoLat =
          typeof record.rend_hco_lat === "number" && !isNaN(record.rend_hco_lat) ? record.rend_hco_lat : null
        const hcoLong =
          typeof record.rend_hco_long === "number" && !isNaN(record.rend_hco_long) ? record.rend_hco_long : null
        const hcoName = record.hco_mdm_name || record.hco_name || "Healthcare Organization"
        const hcoGrouping = record.hco_grouping || "Unspecified"

        if (hcoLat !== null && hcoLong !== null) {
          if (!locationMap.has(record.hco_state)) {
            locationMap.set(record.hco_state, [])
          }

          // Check if this HCO is already in the location array
          const existingLocation = locationMap.get(record.hco_state).find((loc) => loc.id === record.hco_mdm)

          if (existingLocation) {
            // Update existing location
            if (record.patient_id && record.patient_id !== "-") {
              existingLocation.patients.add(record.patient_id)
            }
            if (record.hcp_id && record.hcp_id !== "-") {
              existingLocation.hcps.add(record.hcp_id)
            }
            // Update name if we have a better one now
            if (hcoName && hcoName !== "Healthcare Organization") {
              existingLocation.name = hcoName
            }
            // Store the grouping information
            if (hcoGrouping && hcoGrouping !== "Unspecified") {
              existingLocation.grouping = hcoGrouping
            }
          } else {
            // Add new location with the correct name and grouping
            locationMap.get(record.hco_state).push({
              id: record.hco_mdm,
              name: hcoName,
              lat: hcoLat,
              lng: hcoLong,
              zip: record.hco_postal_cd_prim,
              grouping: hcoGrouping,
              patients: new Set(record.patient_id && record.patient_id !== "-" ? [record.patient_id] : []),
              hcps: new Set(record.hcp_id && record.hcp_id !== "-" ? [record.hcp_id] : []),
            })
          }
        }
      }

      // Process referring HCO data
      if (
        record.ref_hco_npi_mdm &&
        record.ref_hco_state &&
        record.ref_hco_npi_mdm !== "-" &&
        record.ref_hco_state !== "-"
      ) {
        // State level counts
        if (!hcoStateMap.has(record.ref_hco_state)) {
          hcoStateMap.set(record.ref_hco_state, new Set())
        }
        hcoStateMap.get(record.ref_hco_state).add(record.ref_hco_npi_mdm)

        // Add patient to state count
        if (record.patient_id && record.patient_id !== "-") {
          if (!patientStateMap.has(record.ref_hco_state)) {
            patientStateMap.set(record.ref_hco_state, new Set())
          }
          patientStateMap.get(record.ref_hco_state).add(record.patient_id)
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

    // Process location data
    const locationData = {}
    locationMap.forEach((locations, state) => {
      locationData[state] = locations.map((loc) => ({
        ...loc,
        patientCount: loc.patients.size,
        hcpCount: loc.hcps.size,
      }))
    })

    return {
      hcpStateCounts,
      hcoStateCounts,
      patientStateCounts,
      hcpZipData,
      hcoZipData,
      locationData,
    }
  }, [filteredMapData])

  // Create color scale based on patient counts
  const colorScale = useMemo(() => {
    // Get all values for the scale
    const values = Object.values(patientStateCounts).filter((val) => val > 0)

    if (values.length === 0) return () => COLOR_RANGE[0]

    // Create a quantile scale
    return scaleQuantile().domain(values).range(COLOR_RANGE)
  }, [patientStateCounts])

  // Get ZIP codes for selected state
  const selectedStateZips = useMemo(() => {
    if (!selectedState) return []

    // Combine HCP and HCO zip data
    const hcpZips = hcpZipData.filter((item) => item.state === selectedState)
    const hcoZips = hcoZipData.filter((item) => item.state === selectedState)

    // Merge the data by zip code
    const zipMap = new Map()

    // Process HCP data
    hcpZips.forEach((item) => {
      zipMap.set(item.zip, {
        state: item.state,
        zip: item.zip,
        hcpCount: item.count,
        hcoCount: 0,
        patientCount: item.patientCount,
      })
    })

    // Process HCO data and merge with existing entries
    hcoZips.forEach((item) => {
      if (zipMap.has(item.zip)) {
        const existing = zipMap.get(item.zip)
        existing.hcoCount = item.count
        existing.patientCount = Math.max(existing.patientCount, item.patientCount)
      } else {
        zipMap.set(item.zip, {
          state: item.state,
          zip: item.zip,
          hcpCount: 0,
          hcoCount: item.count,
          patientCount: item.patientCount,
        })
      }
    })

    // Convert to array and sort by patient count
    return Array.from(zipMap.values()).sort((a, b) => b.patientCount - a.patientCount)
  }, [selectedState, hcpZipData, hcoZipData])

  // Function to display territory boundaries using ZIP codes
  const showTerritoryZipBoundaries = (territory) => {
    console.log("Showing ZIP boundaries for territory:", territory)

    if (!mapInstanceRef.current || !zipGeoJsonRef.current) {
      console.error("Map or ZIP GeoJSON not initialized")
      return
    }

    // Clear previous zip layer if it exists
    if (zipLayerRef.current) {
      mapInstanceRef.current.removeLayer(zipLayerRef.current)
      zipLayerRef.current = null
    }

    // Get all zip codes for this territory
    const territoryZips = Object.entries(territoryZipMapping)
      .filter(([_, t]) => t === territory)
      .map(([zip]) => zip)

    if (territoryZips.length === 0) {
      console.log("No ZIP codes found for territory:", territory)
      return
    }

    console.log(`Found ${territoryZips.length} ZIP codes for territory ${territory}`)

    // Filter the GeoJSON to include only the zips for this territory
    const filteredFeatures = zipGeoJsonRef.current.features.filter((feature) => {
      const zipCode = feature.properties.ZCTA5CE10
      return territoryZips.includes(zipCode)
    })

    if (filteredFeatures.length === 0) {
      console.log("No matching GeoJSON features found for territory ZIP codes")
      return
    }

    console.log(`Matched ${filteredFeatures.length} GeoJSON features`)

    // Create a new GeoJSON with filtered features
    const filteredGeoJson = {
      type: "FeatureCollection",
      features: filteredFeatures,
    }

    // Create and add the ZIP layer with green color
    try {
      zipLayerRef.current = L.geoJSON(filteredGeoJson, {
        style: {
          fillColor: "#00B050", // Green color
          weight: 1,
          opacity: 1,
          color: "#006D2C",
          fillOpacity: 0.6,
        },
      }).addTo(mapInstanceRef.current)

      // Calculate bounds and zoom to fit
      const bounds = zipLayerRef.current.getBounds()
      if (bounds.isValid()) {
        mapInstanceRef.current.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 7,
        })
      }
    } catch (error) {
      console.error("Error creating ZIP layer:", error)
    }
  }

  // Function to add markers for a selected state
  const addStateMarkers = (stateAbbr) => {
    console.log("Adding markers for state:", stateAbbr)

    // Add a small delay to ensure the map is ready
    setTimeout(() => {
      if (!mapInstanceRef.current) {
        console.error("Map not initialized in addStateMarkers")
        return
      }

      if (!markerClusterRef.current) {
        console.log("Creating new marker cluster group")
        try {
          const markerCluster = L.markerClusterGroup({
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            spiderfyOnMaxZoom: true,
            removeOutsideVisibleBounds: false,
            disableClusteringAtZoom: 8,
            maxClusterRadius: 80,
          })
          mapInstanceRef.current.addLayer(markerCluster)
          markerClusterRef.current = markerCluster
        } catch (error) {
          console.error("Error creating marker cluster:", error)
          return
        }
      }

      try {
        // Clear existing markers
        markerClusterRef.current.clearLayers()

        // Get location data for the state
        const stateLocations = locationData[stateAbbr] || []

        if (stateLocations.length === 0) {
          console.log(`No location data available for state: ${stateAbbr}`)
          return
        }

        console.log(`Adding ${stateLocations.length} markers for ${stateAbbr}`)

        // Then modify the marker creation to ensure we're using the correct name
        stateLocations.forEach((location) => {
          if (!location.lat || !location.lng || isNaN(location.lat) || isNaN(location.lng)) return

          // Validate coordinates
          const lat = Number.parseFloat(location.lat)
          const lng = Number.parseFloat(location.lng)

          if (isNaN(lat) || isNaN(lng)) return

          // Get the color based on grouping
          const markerColor = groupingColors[location.grouping] || groupingColors["Unspecified"]

          // Create custom icon with the appropriate color based on grouping
          const hcoIcon = L.divIcon({
            className: "custom-marker-icon",
            html: `
              <div style="
                position: relative;
                width: 30px;
                height: 30px;
                cursor: pointer;
              ">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" width="30" height="30" style="position: absolute; top: 0; left: 0; pointer-events: all;">
                  <path fill="${markerColor}" fillRule="evenodd"
                    d="M11.291 21.706 12 21l-.709.706zM12 21l.708.706a1 1 0 0 1-1.417 0l-.006-.007-.017-.017-.062-.063a47.708 47.708 0 0 1-1.04-1.106 49.562 49.562 0 0 1-2.456-2.908c-.892-1.15-1.804-2.45-2.497-3.734C4.535 12.612 4 11.248 4 10c0-4.539 3.592-8 8-8 4.408 0 8 3.461 8 8 0 1.248-.535 2.612-1.213 3.87-.693 1.286-1.604 2.585-2.497 3.735a49.583 49.583 0 0 1-3.496 4.014l-.062.063-.017.017-.006.006L12 21zm0-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
                    clipRule="evenodd"></path>
                </svg>
              </div>
            `,
            iconSize: [30, 30],
            iconAnchor: [15, 30], // anchor should be at the bottom center
          })

          try {
            const marker = L.marker([lat, lng], {
              icon: hcoIcon,
              zIndexOffset: 1000,
            })

            // Use the actual name from the location data, with a fallback
            const displayName = location.name || "Healthcare Organization"
            const displayGrouping = location.grouping === "Unspecified" ? "Not Specified" : location.grouping

            // Add popup with information
            marker.bindPopup(`
              <div class="p-2 text-[12px]">
                <h3 class="font-bold">${displayName}</h3>
                <p>Grouping: ${displayGrouping}</p>
                <p>HCPs: ${location.hcpCount}</p>
                <p>Patients: ${location.patientCount}</p>
                <p>ZIP: ${location.zip || "N/A"}</p>
              </div>
            `)

            // Add hover effect with the correct name
            marker.on({
              mouseover: () => {
                if (mapInstanceRef.current) {
                  marker.openPopup()
                  setZipTooltipContent(`
                    <strong>${displayName}</strong><br>
                    Grouping: ${displayGrouping}<br>
                    HCPs: ${location.hcpCount}<br>
                    Patients: ${location.patientCount}
                  `)
                }
              },
              mouseout: () => {
                if (mapInstanceRef.current) {
                  marker.closePopup()
                  setZipTooltipContent("")
                }
              },
              click: () => {
                // Navigate to HCO details when marker is clicked
                getHCODetails(location.id)
              },
            })

            markerClusterRef.current.addLayer(marker)
          } catch (markerError) {
            console.error("Error creating marker:", markerError)
          }
        })

        // Force the marker cluster to update
        if (mapInstanceRef.current.hasLayer(markerClusterRef.current)) {
          console.log("Refreshing marker cluster layer")
        } else {
          console.log("Adding marker cluster to map")
          mapInstanceRef.current.addLayer(markerClusterRef.current)
        }
      } catch (error) {
        console.error("Error adding state markers:", error)
      }
    }, 300) // Add a delay to ensure map is ready
  }

  // Clean up map instance
  const cleanupMap = () => {
    if (mapInstanceRef.current) {
      try {
        // Remove marker cluster first
        if (markerClusterRef.current) {
          markerClusterRef.current.clearLayers()
          if (mapInstanceRef.current.hasLayer(markerClusterRef.current)) {
            mapInstanceRef.current.removeLayer(markerClusterRef.current)
          }
          markerClusterRef.current = null
        }

        // Remove zip layer
        if (zipLayerRef.current) {
          if (mapInstanceRef.current.hasLayer(zipLayerRef.current)) {
            mapInstanceRef.current.removeLayer(zipLayerRef.current)
          }
          zipLayerRef.current = null
        }

        // Remove state layer
        if (stateLayerRef.current) {
          if (mapInstanceRef.current.hasLayer(stateLayerRef.current)) {
            mapInstanceRef.current.removeLayer(stateLayerRef.current)
          }
          stateLayerRef.current = null
        }

        // Remove map
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        geoJsonLoadedRef.current = false
        mapInitializedRef.current = false
      } catch (error) {
        console.error("Error cleaning up map:", error)
      }
    }
  }

  // Track component mount status to prevent operations after unmount
  useEffect(() => {
    mapMountedRef.current = true

    return () => {
      mapMountedRef.current = false
    }
  }, [])

  // Initialize map
  useEffect(() => {
    // Check if the map is already initialized
    if (mapInitializedRef.current || mapInstanceRef.current) {
      return
    }

    // Check if the map container exists
    const container = document.getElementById(mapContainerId.current)
    if (!container) {
      console.error("Map container not found")
      return
    }

    // Ensure we don't try to initialize after unmount
    if (!mapMountedRef.current) return

    try {
      // Set flag to prevent multiple initializations
      mapInitializedRef.current = true

      // Fix for Leaflet icon issue
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      })

      // Create map instance with error handling
      let map
      try {
        map = L.map(container, {
          center: [39.8283, -98.5795], // Center of the US
          zoom: 4,
          minZoom: 3,
          maxZoom: 18,
          worldCopyJump: true,
          maxBoundsViscosity: 1.0,
          maxBounds: [
            [-90, -180], // Southwest corner
            [90, 180], // Northeast corner
          ],
        })
      } catch (mapError) {
        console.error("Error creating map instance:", mapError)
        mapInitializedRef.current = false
        return
      }

      // Add tile layer with bounds restriction
      try {
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          noWrap: true, // Prevent the map from repeating horizontally
          bounds: [
            [-90, -180], // Southwest corner
            [90, 180], // Northeast corner
          ],
        }).addTo(map)
      } catch (tileError) {
        console.error("Error adding tile layer:", tileError)
      }

      // Add event handlers to catch and prevent errors
      map.on("error", (e) => {
        console.error("Leaflet error:", e.error)
      })

      // Prevent interactions outside the map bounds
      map.on("drag", () => {
        map.panInsideBounds(map.options.maxBounds, { animate: false })
      })

      // Create marker cluster group with specific options for better visibility
      let markerCluster
      try {
        markerCluster = L.markerClusterGroup({
          showCoverageOnHover: false,
          zoomToBoundsOnClick: true,
          spiderfyOnMaxZoom: true,
          removeOutsideVisibleBounds: false,
          disableClusteringAtZoom: 8, // Show individual markers at zoom level 8 and above
          maxClusterRadius: 80, // Larger value creates fewer, larger clusters
        })
        map.addLayer(markerCluster)
      } catch (clusterError) {
        console.error("Error creating marker cluster:", clusterError)
        markerCluster = null
      }

      // Save references
      mapInstanceRef.current = map
      markerClusterRef.current = markerCluster
      mapRef.current = container

      // Force a resize to ensure the map is properly initialized
      try {
        map.invalidateSize()
      } catch (resizeError) {
        console.error("Error resizing map:", resizeError)
      }

      // Load GeoJSON for states
      fetch(statesGeoJsonUrl)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`)
          }
          return response.json()
        })
        .then((data) => {
          if (!mapInstanceRef.current || !mapMountedRef.current) {
            console.error("Map instance not available when loading GeoJSON")
            return
          }

          // Filter to include only US states (exclude territories)
          const filteredStates = {
            ...data,
            features: data.features.filter((feature) => stateNameToAbbreviation[feature.properties.name]),
          }

          // Add GeoJSON layer with error handling
          let stateLayer
          try {
            stateLayer = L.geoJSON(filteredStates, {
              style: (feature) => {
                const stateName = feature.properties.name
                const stateAbbr = stateNameToAbbreviation[stateName]
                const patientCount = stateAbbr ? patientStateCounts[stateAbbr] || 0 : 0

                // If a state is selected and this is not the selected state, make it colorless
                if (selectedState && stateAbbr !== selectedState) {
                  return {
                    fillColor: "#EEE", // Light gray for non-selected states
                    weight: 1,
                    opacity: 1,
                    color: "white",
                    fillOpacity: 0.3, // Lower opacity
                  }
                }

                // Check if territory filter is active
                const hasTerritoryFilter = selectedTerritories && selectedTerritories.length > 0

                // If territory filter is active and this state is not in selected territories
                if (hasTerritoryFilter && !statesInSelectedTerritories.has(stateAbbr)) {
                  return {
                    fillColor: "#EEE", // Light gray for states not in selected territories
                    weight: 1,
                    opacity: 1,
                    color: "white",
                    fillOpacity: 0.3, // Lower opacity
                  }
                }

                return {
                  fillColor: patientCount > 0 ? colorScale(patientCount) : "#EEE",
                  weight: 1,
                  opacity: 1,
                  color: "white",
                  fillOpacity: 0.7,
                }
              },
              onEachFeature: (feature, layer) => {
                const stateName = feature.properties.name
                const stateAbbr = stateNameToAbbreviation[stateName]

                if (stateAbbr) {
                  // Add hover effect
                  layer.on({
                    mouseover: (e) => {
                      const layer = e.target
                      layer.setStyle({
                        weight: 2,
                        color: "#666",
                        fillOpacity: 0.9,
                      })

                      if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                        layer.bringToFront()
                      }

                      // Set tooltip content
                      const hcpCount = hcpStateCounts[stateAbbr] || 0
                      const hcoCount = hcoStateCounts[stateAbbr] || 0
                      const patientCount = patientStateCounts[stateAbbr] || 0

                      setTooltipContent(`
                        <strong>${stateName}</strong><br>
                        HCP Count: ${hcpCount}<br>
                        HCO Count: ${hcoCount}<br>
                        Patient Count: ${patientCount}
                      `)
                    },
                    mouseout: (e) => {
                      if (stateLayer && stateLayer.resetStyle) {
                        stateLayer.resetStyle(e.target)
                      }
                      setTooltipContent("")
                    },
                    click: (e) => {
                      try {
                        if (!mapInstanceRef.current) {
                          console.error("Map not initialized during click")
                          return
                        }

                        // Handle state selection
                        if (selectedState === stateAbbr) {
                          // Deselect state
                          if (onStateSelect) onStateSelect(null)

                          // Reset view
                          mapInstanceRef.current.setView([39.8283, -98.5795], 4)

                          // Clear markers
                          if (markerClusterRef.current) {
                            markerClusterRef.current.clearLayers()
                          }
                        } else {
                          // Select state
                          if (onStateSelect) onStateSelect(stateAbbr)

                          // Zoom to state
                          if (stateCenters[stateAbbr]) {
                            const [lat, lng, zoom] = stateCenters[stateAbbr]
                            mapInstanceRef.current.setView([lat, lng], zoom)

                            // Add a small delay before adding markers to ensure the map is ready
                            setTimeout(() => {
                              console.log("Map zoomed, now adding markers")
                              if (mapInstanceRef.current && mapMountedRef.current) {
                                addStateMarkers(stateAbbr)
                              }
                            }, 500)
                          }
                        }
                      } catch (error) {
                        console.error("Error handling state click:", error)
                      }
                    },
                  })
                }
              },
            }).addTo(mapInstanceRef.current)

            stateLayerRef.current = stateLayer
            geoJsonLoadedRef.current = true
          } catch (geoJsonError) {
            console.error("Error creating GeoJSON layer:", geoJsonError)
          }
        })
        .catch((error) => {
          console.error("Error loading GeoJSON:", error)
          setError("Failed to load map data: " + error.message)
        })
    } catch (error) {
      console.error("Error initializing map:", error)
      setError("Error initializing map: " + error.message)
      mapInitializedRef.current = false
    }

    // Cleanup on unmount
    return () => {
      cleanupMap()
    }
  }, [
    mapContainerId,
    colorScale,
    hcpStateCounts,
    hcoStateCounts,
    patientStateCounts,
    onStateSelect,
    selectedTerritories,
    statesInSelectedTerritories,
    selectedState,
  ])

  // Add this CSS to the top of the file to ensure markers are visible
  useEffect(() => {
    // Add custom CSS to ensure markers are visible
    if (typeof document !== "undefined" && mapMountedRef.current) {
      const style = document.createElement("style")
      style.textContent = `
        .leaflet-marker-icon {
          z-index: 1000 !important;
        }
        .leaflet-marker-pane {
          z-index: 600 !important;
        }
        .leaflet-popup-pane {
          z-index: 700 !important;
        }
        .marker-cluster {
          z-index: 650 !important;
        }
        .custom-marker-icon {
          cursor: pointer;
        }
        .custom-marker-icon > div {
          pointer-events: auto !important;
        }
        .custom-marker-icon svg {
          pointer-events: auto !important;
        }
      `
      document.head.appendChild(style)

      return () => {
        if (document.head.contains(style)) {
          document.head.removeChild(style)
        }
      }
    }
  }, [])

  // Update state styles when color scale or territory selection changes
  useEffect(() => {
    if (!stateLayerRef.current || !geoJsonLoadedRef.current || !mapMountedRef.current) return

    try {
      stateLayerRef.current.eachLayer((layer) => {
        const stateName = layer.feature.properties.name
        const stateAbbr = stateNameToAbbreviation[stateName]
        const patientCount = stateAbbr ? patientStateCounts[stateAbbr] || 0 : 0

        // If a state is selected and this is not the selected state, make it colorless
        if (selectedState && stateAbbr !== selectedState) {
          layer.setStyle({
            fillColor: "#EEE", // Light gray for non-selected states
            fillOpacity: 0.3, // Lower opacity
          })
          return
        }

        // Check if territory filter is active
        const hasTerritoryFilter = selectedTerritories && selectedTerritories.length > 0

        // If territory filter is active and this state is not in selected territories
        if (hasTerritoryFilter && !statesInSelectedTerritories.has(stateAbbr)) {
          layer.setStyle({
            fillColor: "#EEE", // Light gray for states not in selected territories
            fillOpacity: 0.3, // Lower opacity
          })
        } else {
          layer.setStyle({
            fillColor: patientCount > 0 ? colorScale(patientCount) : "#EEE",
            fillOpacity: 0.7,
          })
        }
      })
    } catch (error) {
      console.error("Error updating state styles:", error)
    }
  }, [colorScale, patientStateCounts, selectedTerritories, statesInSelectedTerritories, selectedState])

  // Handle territory selection - Show ZIP level boundaries
  useEffect(() => {
    if (!mapInstanceRef.current || !mapMountedRef.current || !Object.keys(territoryZipMapping).length) return

    // Clear any existing ZIP boundaries
    if (zipLayerRef.current) {
      mapInstanceRef.current.removeLayer(zipLayerRef.current)
      zipLayerRef.current = null
    }

    // If a territory is selected, show its ZIP boundaries
    if (selectedTerritories && selectedTerritories.length === 1) {
      const territory = selectedTerritories[0]
      showTerritoryZipBoundaries(territory)
    }
  }, [selectedTerritories, territoryZipMapping])

  // Update markers when selectedState or filters change
  useEffect(() => {
    if (!mapInstanceRef.current || !mapMountedRef.current) return

    try {
      if (selectedState) {
        console.log("Selected state or filters changed, updating markers")

        // Use a longer timeout to ensure map is fully zoomed before adding markers
        const timer = setTimeout(() => {
          if (mapInstanceRef.current && mapMountedRef.current) {
            console.log("Adding markers after state selection or filter change")
            addStateMarkers(selectedState)
          }
        }, 800)

        return () => clearTimeout(timer)
      } else if (markerClusterRef.current) {
        markerClusterRef.current.clearLayers()
      }
    } catch (error) {
      console.error("Error updating markers on state or filter change:", error)
    }
  }, [selectedState, filteredMapData, selectedHcpSegment, selectedHcoGrouping])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (mapInstanceRef.current && mapMountedRef.current) {
        try {
          mapInstanceRef.current.invalidateSize()
        } catch (error) {
          console.error("Error resizing map:", error)
        }
      }
    }

    window.addEventListener("resize", handleResize)

    // Initial invalidateSize after a short delay to ensure the container is fully rendered
    const timer = setTimeout(() => {
      if (mapInstanceRef.current && mapMountedRef.current) {
        try {
          mapInstanceRef.current.invalidateSize()
        } catch (error) {
          console.error("Error initializing map size:", error)
        }
      }
    }, 300)

    return () => {
      window.removeEventListener("resize", handleResize)
      clearTimeout(timer)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return <div className="text-red-500">Error loading map data: {error}</div>
  }

  // Calculate how many ZIP codes to display
  const zipDisplayCount = showAllZips ? selectedStateZips.length : 12

  return (
    <div className="flex flex-col gap-4">
      {/* Map container */}
      <div className="relative bg-white rounded-xl border border-gray-200 shadow-sm">
        <div id={mapContainerId.current} style={{ height: "518px", width: "100%" }} className="rounded-xl z-0"></div>

        {/* Map tooltip */}
        <div
          className="absolute bg-white p-2 rounded shadow-md text-[10px] z-10 pointer-events-none"
          style={{
            display: tooltipContent ? "block" : "none",
            left: "30%",
            bottom: "10px",
            transform: "translateX(-50%)",
          }}
          dangerouslySetInnerHTML={{ __html: tooltipContent }}
        />

        {/* Legend */}
        <div className="absolute bottom-0 right-0 bg-white p-2 rounded-md shadow-md text-xs z-10">
          <div className="text-[10px] font-medium mb-1">Patient Count</div>
          <div className="flex items-center">
            <div className="mr-1 text-[10px]">Low</div>
            <div className="flex">
              {COLOR_RANGE.map((color, i) => (
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
          <div className="grid grid-cols-2 mt-2 gap-1">
            <div className="flex items-center">
              <div className="w-2 h-2 mr-1" style={{ backgroundColor: groupingColors["CURRENT IV"] }}></div>
              <span className="text-[8px]">CURRENT IV</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 mr-1" style={{ backgroundColor: groupingColors["IV AFFILIATES"] }}></div>
              <span className="text-[8px]">IV AFFILIATES</span>
            </div>
            <div className="flex items-center">
              <div
                className="w-2 h-2 mr-1"
                style={{ backgroundColor: groupingColors["NEW IT TREATMENT CENTERS"] }}
              ></div>
              <span className="text-[8px]">NEW IT TREATMENT CENTERS</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 mr-1" style={{ backgroundColor: groupingColors["NEW TREATMENT CENTERS"] }}></div>
              <span className="text-[8px]">NEW TREATMENT CENTERS</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 mr-1" style={{ backgroundColor: groupingColors["Unspecified"] }}></div>
              <span className="text-[8px]">UNSPECIFIED</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default USAMap
