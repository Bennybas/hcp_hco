"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import "leaflet.markercluster"
import "leaflet.markercluster/dist/MarkerCluster.css"
import "leaflet.markercluster/dist/MarkerCluster.Default.css"
import api from "../api/api"
import { useNavigate } from "react-router-dom"
import { X } from "lucide-react"

// Territory mapping data
const TERRITORY_MAPPING = {
  1: {
    name: "SOUTHEAST",
    states: ["PR", "NC", "FL", "SC", "GA"],
  },
  2: {
    name: "MIDWEST",
    states: ["IA", "MO", "NE", "KY", "IL", "IN", "OK", "KS"],
  },
  3: {
    name: "CAPITOL",
    states: ["NJ", "PA", "DE", "VA", "DC", "MD", "WV"],
  },
  4: {
    name: "ROCKY MOUNTAIN",
    states: ["MO", "CO", "UT", "NV", "NM", "WY", "WA", "MT", "ID", "OR", "AK"],
  },
  5: {
    name: "TEXAS",
    states: ["MO", "AR", "TX"],
  },
  6: {
    name: "SOUTHWEST",
    states: ["AZ", "CA", "HI"],
  },
  7: {
    name: "SOUTH CENTRAL",
    states: ["AL", "MS", "LA", "KY", "TN", "TX"],
  },
  8: {
    name: "OHIO VALLEY",
    states: ["OH", "MI"],
  },
  9: {
    name: "UPPER MIDWEST",
    states: ["ND", "IL", "MN", "SD", "WI"],
  },
  10: {
    name: "NEW ENGLAND",
    states: ["MA", "RI", "NH", "ME", "CT", "PA", "NY", "VT"],
  },
}

// Distinct colors for each territory
const TERRITORY_COLORS = {
  "NEW ENGLAND": "#FF5733", // Bright Orange-Red
  SOUTHEAST: "#33B5FF", // Vivid Sky Blue
  CAPITOL: "#9B59B6", // Purple
  "SOUTH CENTRAL": "#27AE60", // Forest Green
  MIDWEST: "#F1C40F", // Bright Yellow
  "OHIO VALLEY": "#E67E22", // Deep Orange
  "UPPER MIDWEST": "#1ABC9C", // Teal
  "ROCKY MOUNTAIN": "#E74C3C", // Bold Red
  TEXAS: "#2980B9", // Bold Blue
  SOUTHWEST: "#8E44AD", // Deep Purple

  // Fallback
  DEFAULT: "#BDC3C7", // Light Gray
}

// HCO grouping colors mapping
const groupingColors = {
  "CURRENT IV": "#00B050", // Green
  "IV AFFILIATES": "#FFC100", // Yellow/Gold
  "NEW IT TREATMENT CENTERS": "#7030A0", // Purple
  "NEW TREATMENT CENTERS": "#FF585D", // Red
  UNSPECIFIED: "#CCCCCC", // Light gray for unspecified/missing values
}

// Updated territory centers with exact coordinates provided
const territoryCenters = {
  "NEW ENGLAND": [44.2033, -70.3039, 6],
  SOUTHEAST: [33.0632746, -80.2788229, 6],
  CAPITOL: [38.8898, -77.0091, 6],
  "SOUTH CENTRAL": [32.3182314, -86.902298, 6],
  MIDWEST: [39.09973, -94.57857, 6],
  "OHIO VALLEY": [44.3148443, -85.60236429999998, 6],
  "UPPER MIDWEST": [46.877186, -96.789803, 6],
  "ROCKY MOUNTAIN": [47.608013, -122.335167, 5],
  TEXAS: [31.9686, -99.9018, 6],
  SOUTHWEST: [34.052235, -118.243683, 6],
}

const USAMap = ({
  onStateSelect,
  selectedState,
  selectedTerritories = [],
  selectedYears = [],
  selectedHcpSegment = null,
  selectedHcoGrouping = null,
  filteredData = [], // Add this prop
}) => {
  const navigate = useNavigate()
  const [mapData, setMapData] = useState([])
  const [filteredMapData, setFilteredMapData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tooltipContent, setTooltipContent] = useState("")
  const [zipTooltipContent, setZipTooltipContent] = useState("")
  const mapContainerId = useRef(`map-container-${Math.random().toString(36).substring(2, 9)}`)
  const [territoryZipMapping, setTerritoryZipMapping] = useState({})
  const [zipTerritoryMapping, setZipTerritoryMapping] = useState({})
  const [territoryData, setTerritoryData] = useState({})
  const [mapInitialized, setMapInitialized] = useState(false)
  const [selectedTerritory, setSelectedTerritory] = useState(null) // Track the selected territory
  const [territoryGeoJsons, setTerritoryGeoJsons] = useState({}) // Store territory GeoJSON data
  const [allDataLoaded, setAllDataLoaded] = useState(false)
  const [territoryCountsCache, setTerritoryCountsCache] = useState({
    patients: {},
    hcos: {},
    hcps: {},
  })

  // Refs for map and layers
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const territoryLayerRef = useRef(null)
  const markerClusterRef = useRef(null)
  const zipGeoJsonRef = useRef(null)
  const mapInitializedRef = useRef(false)
  const mapMountedRef = useRef(false)
  const dataLoadedRef = useRef(false)
  const geoJsonLoadedRef = useRef(false)
  const currentSelectedTerritoriesRef = useRef([]) // Changed to array for multiple selection
  const initializationAttempts = useRef(0)
  const maxInitAttempts = 5
  const initTimerRef = useRef(null)
  const prevFiltersRef = useRef({ hcpSegment: null, hcoGrouping: null })
  const isResettingRef = useRef(false) // Flag to prevent reset recursion
  const lastValidTerritoryCounts = useRef({
    patients: {},
    hcos: {},
    hcps: {},
  }) // Keep last valid counts
  const processedFilteredDataRef = useRef(false)

  // Function to navigate to HCO details
  const getHCODetails = (hcoId) => {
    navigate("/hco", { state: { hco_id: hcoId } })
  }

  // Debug logging function
  const logDebug = (message, data = null) => {
    console.log(`[USAMap Debug] ${message}`, data || "")
  }

  // Fetch ZIP to territory mapping from API
  useEffect(() => {
    const fetchTerritoryZips = async () => {
      try {
        logDebug("Fetching territory zip mapping")
        const response = await fetch(`${api}/zip-data`)
        if (!response.ok) {
          throw new Error(`Failed to fetch territory zip mapping: ${response.status}`)
        }
        const data = await response.json()

        // Process the data to create mappings
        const zipToTerritory = {}
        const territoryToZips = {}

        data.forEach((item) => {
          const territory = item.territory_name

          // Parse the zips from the string format to an array of strings
          let zips = []
          try {
            if (item.agg_zips && item.agg_zips !== "[]") {
              // Handle different possible formats
              if (item.agg_zips.startsWith("[") && item.agg_zips.endsWith("]")) {
                // Format: [00601, 00602, ...]
                zips = item.agg_zips
                  .replace(/\[|\]/g, "")
                  .split(",")
                  .map((zip) => zip.trim())
              } else {
                // Format: 00601,00602,...
                zips = item.agg_zips.split(",").map((zip) => zip.trim())
              }
            }
          } catch (parseError) {
            console.error("Error parsing zip codes:", parseError, item.agg_zips)
            zips = []
          }

          // Initialize territory entry if it doesn't exist
          if (!territoryToZips[territory]) {
            territoryToZips[territory] = []
          }

          // Add zips to territory mapping
          territoryToZips[territory].push(...zips)

          // Add each zip to zip-to-territory mapping
          zips.forEach((zip) => {
            zipToTerritory[zip] = territory
          })
        })

        setTerritoryZipMapping(territoryToZips)
        setZipTerritoryMapping(zipToTerritory)
        logDebug(`Loaded ZIP mappings: ${Object.keys(zipToTerritory).length} ZIP codes`)
      } catch (error) {
        console.error("Error fetching territory zip mapping:", error)
        setError("Error fetching territory zip data: " + error.message)
      }
    }

    fetchTerritoryZips()
  }, [])

  // Load ZIP code GeoJSON data
  useEffect(() => {
    // Add error handling and logging for GeoJSON loading
    const fetchZipGeoJson = async () => {
      try {
        logDebug("Fetching ZIP GeoJSON data")
        // Change the path to be more deployment-friendly
        const response = await fetch("/usa_zip_codes_geo_15m.json")
        if (!response.ok) {
          console.error(`Failed to load ZIP GeoJSON: ${response.status} ${response.statusText}`)
          throw new Error(`Failed to load ZIP code GeoJSON: ${response.status}`)
        }
        const data = await response.json()
        zipGeoJsonRef.current = data
        geoJsonLoadedRef.current = true
        logDebug(`Loaded ZIP GeoJSON with ${data.features.length} features`)

        // Try to create territory layer if map is already initialized
        if (mapInstanceRef.current && !territoryLayerRef.current) {
          setTimeout(() => createTerritoryLayer(), 500)
        }
      } catch (error) {
        console.error("Error loading ZIP GeoJSON:", error)
        // More detailed error message
        setError(`Error loading ZIP code map data: ${error.message}. Make sure the GeoJSON file is properly deployed.`)
      }
    }

    fetchZipGeoJson()
  }, [])

  // Add this at the beginning of the component to ensure Leaflet CSS is loaded
  useEffect(() => {
    // Ensure Leaflet CSS is loaded
    if (typeof document !== "undefined") {
      const linkExists = document.querySelector('link[href*="leaflet.css"]')
      if (!linkExists) {
        const link = document.createElement("link")
        link.rel = "stylesheet"
        link.href = "https://unpkg.com/leaflet@1.7.1/dist/leaflet.css"
        link.integrity =
          "sha512-xodZBNTC5n17Xt2atTPuE1HxjVMSvLVW9ocqUKLsCC5CXdbqCmblAshOMAS6/keqq/sMZMZ19scR4PsZChSR7A=="
        link.crossOrigin = ""
        document.head.appendChild(link)

        // Also add MarkerCluster CSS
        const clusterCss = document.createElement("link")
        clusterCss.rel = "stylesheet"
        clusterCss.href = "https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css"
        document.head.appendChild(clusterCss)

        const clusterDefaultCss = document.createElement("link")
        clusterDefaultCss.rel = "stylesheet"
        clusterDefaultCss.href = "https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css"
        document.head.appendChild(clusterDefaultCss)
      }
    }
  }, [])

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Only fetch if we don't already have data and no filteredData was provided
        if (mapData.length === 0 && (!filteredData || filteredData.length === 0)) {
          setLoading(true)
          logDebug("Fetching map data from API")

          const response = await fetch(`${api}/map-data`)
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
          dataLoadedRef.current = true
          logDebug(`Loaded ${cleanedData.length} map data records`)
        }
        // If filteredData is provided, use it instead
        else if (filteredData && filteredData.length > 0) {
          // Only update if the filtered data has changed
          const filteredDataString = JSON.stringify(filteredData)
          const currentFilteredDataString = JSON.stringify(filteredMapData)

          if (filteredDataString !== currentFilteredDataString) {
            logDebug(`Using ${filteredData.length} filtered records from parent component`)
            setFilteredMapData(filteredData)
          }
        }
      } catch (error) {
        console.error("Error fetching map data:", error)
        setError("Error fetching data: " + error.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    // Only re-run this effect when filteredData reference changes, not its contents
  }, [filteredData])

  // Handle changes to selectedTerritories prop
  useEffect(() => {
    if (selectedTerritories && selectedTerritories.length > 0 && mapInstanceRef.current) {
      // Update our ref to match the prop
      currentSelectedTerritoriesRef.current = [...selectedTerritories]

      // Show all selected territories
      showMultipleTerritories(selectedTerritories)
    } else if (
      selectedTerritories &&
      selectedTerritories.length === 0 &&
      currentSelectedTerritoriesRef.current.length > 0 &&
      !isResettingRef.current
    ) {
      // If territories were cleared from parent, reset the view
      resetTerritoryView()
    }
  }, [selectedTerritories])

  // Track changes to HCP/HCO filters
  useEffect(() => {
    // Check if filters have changed
    const filtersChanged =
      prevFiltersRef.current.hcpSegment !== selectedHcpSegment ||
      prevFiltersRef.current.hcoGrouping !== selectedHcoGrouping

    // Update the previous filters reference
    prevFiltersRef.current = {
      hcpSegment: selectedHcpSegment,
      hcoGrouping: selectedHcoGrouping,
    }

    // If filters changed and territories are selected, update markers
    if (filtersChanged && currentSelectedTerritoriesRef.current.length > 0 && mapInstanceRef.current) {
      // Small timeout to ensure state has been updated
      setTimeout(() => {
        // When HCO filter is changed, ensure territory layer is completely hidden
        if (territoryLayerRef.current && mapInstanceRef.current.hasLayer(territoryLayerRef.current)) {
          mapInstanceRef.current.removeLayer(territoryLayerRef.current)
        }

        addTerritoryMarkers(currentSelectedTerritoriesRef.current)
      }, 100)
    }
  }, [selectedHcpSegment, selectedHcoGrouping])

  // Listen for filter changes from parent component
  useEffect(() => {
    const handleFiltersChanged = (event) => {
      // When HCP/HCO filters change, update markers if territories are selected
      if (currentSelectedTerritoriesRef.current.length > 0 && mapInstanceRef.current) {
        // Small timeout to ensure state has been updated
        setTimeout(() => {
          // When filters change, ensure territory layer is completely hidden
          if (territoryLayerRef.current && mapInstanceRef.current.hasLayer(territoryLayerRef.current)) {
            mapInstanceRef.current.removeLayer(territoryLayerRef.current)
          }

          addTerritoryMarkers(currentSelectedTerritoriesRef.current)
        }, 100)
      }
    }

    window.addEventListener("filtersChanged", handleFiltersChanged)

    return () => {
      window.removeEventListener("filtersChanged", handleFiltersChanged)
    }
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
    if (selectedTerritories && selectedTerritories.length > 0 && Object.keys(zipTerritoryMapping).length > 0) {
      filtered = filtered.filter((item) => {
        // Get all ZIP codes from this record
        const zips = new Set()
        if (item.hcp_zip) zips.add(item.hcp_zip)
        if (item.hco_postal_cd_prim) zips.add(item.hco_postal_cd_prim)

        // Check if any of these ZIP codes belong to the selected territories
        for (const zip of zips) {
          const territory = zipTerritoryMapping[zip]
          if (territory && selectedTerritories.includes(territory)) {
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
    logDebug(`Filtered data to ${filtered.length} records`)

    // Update markers if territories are selected
    if (currentSelectedTerritoriesRef.current.length > 0 && mapInstanceRef.current) {
      // Add a small delay to ensure state is updated
      setTimeout(() => {
        addTerritoryMarkers(currentSelectedTerritoriesRef.current)
      }, 100)
    }
  }, [
    mapData,
    selectedState,
    selectedYears,
    selectedTerritories,
    selectedHcpSegment,
    selectedHcoGrouping,
    zipTerritoryMapping,
  ])

  // Add this effect to update the map when filteredData changes
  useEffect(() => {
    if (filteredData && filteredData.length > 0 && mapInstanceRef.current) {
      // Use the ref to prevent multiple updates for the same data
      const filteredDataString = JSON.stringify(filteredData)
      if (processedFilteredDataRef.current === filteredDataString) {
        return
      }

      processedFilteredDataRef.current = filteredDataString
      logDebug(`Updating map with ${filteredData.length} filtered records`)

      // If territories are selected, update the markers
      if (currentSelectedTerritoriesRef.current.length > 0) {
        // When filters change, ensure territory layer is completely hidden
        if (territoryLayerRef.current && mapInstanceRef.current.hasLayer(territoryLayerRef.current)) {
          mapInstanceRef.current.removeLayer(territoryLayerRef.current)
        }

        addTerritoryMarkers(currentSelectedTerritoriesRef.current)
      }
    }
  }, [filteredData])

  // Process data to get counts by territory
  const { territoryPatientCounts, territoryHcoCounts, territoryHcpCounts, locationData } = useMemo(() => {
    if (filteredMapData.length === 0 || Object.keys(zipTerritoryMapping).length === 0) {
      return { territoryPatientCounts: {}, territoryHcoCounts: {}, territoryHcpCounts: {}, locationData: {} }
    }

    // Create maps to store territory-specific data
    const territoryDataMap = new Map()

    // Initialize data structure for all territories
    Object.keys(territoryCenters).forEach((territory) => {
      territoryDataMap.set(territory, {
        patients: new Set(),
        hcos: new Set(),
        hcps: new Set(),
        locations: [],
      })
    })

    // Group data by territory based on rend_hco_territory field
    filteredMapData.forEach((record) => {
      // First check if record has a direct territory assignment
      if (record.rend_hco_territory) {
        const territory = record.rend_hco_territory

        // Skip if territory is not in our list
        if (!territoryDataMap.has(territory)) return

        const territoryData = territoryDataMap.get(territory)

        // Add patient to territory count if valid
        if (record.patient_id && record.patient_id !== "-") {
          territoryData.patients.add(record.patient_id)
        }

        // Add HCO to territory count if valid
        if (record.hco_mdm && record.hco_mdm !== "-") {
          territoryData.hcos.add(record.hco_mdm)
        }

        // Add HCP to territory count if valid
        if (record.hcp_id && record.hcp_id !== "-") {
          territoryData.hcps.add(record.hcp_id)
        }

        // Process location data if lat/long are available
        processLocationData(record, territory, territoryData)
      }
      // If no direct territory assignment, use ZIP codes
      else {
        // Get ZIP codes from this record
        const zips = []
        if (record.hcp_zip) zips.push(record.hcp_zip)
        if (record.hco_postal_cd_prim) zips.push(record.hco_postal_cd_prim)

        // Get territories for these ZIP codes
        const territories = new Set()
        zips.forEach((zip) => {
          const territory = zipTerritoryMapping[zip]
          if (territory) territories.add(territory)
        })

        // If no territories found, skip this record
        if (territories.size === 0) return

        // Process data for each territory
        territories.forEach((territory) => {
          // Skip if territory is not in our list
          if (!territoryDataMap.has(territory)) return

          const territoryData = territoryDataMap.get(territory)

          // Add patient to territory count
          if (record.patient_id && record.patient_id !== "-") {
            territoryData.patients.add(record.patient_id)
          }

          // Add HCO to territory count
          if (record.hco_mdm && record.hco_mdm !== "-") {
            territoryData.hcos.add(record.hco_mdm)
          }

          // Add HCP to territory count
          if (record.hcp_id && record.hcp_id !== "-") {
            territoryData.hcps.add(record.hcp_id)
          }

          // Process location data if lat/long are available
          processLocationData(record, territory, territoryData)
        })
      }
    })

    // Helper function to process location data
    function processLocationData(record, territory, territoryData) {
      const hcoLat = typeof record.rend_hco_lat === "number" && !isNaN(record.rend_hco_lat) ? record.rend_hco_lat : null
      const hcoLong =
        typeof record.rend_hco_long === "number" && !isNaN(record.rend_hco_long) ? record.rend_hco_long : null
      const hcoName = record.hco_mdm_name || record.hco_name || "Healthcare Organization"
      const hcoGrouping = record.hco_grouping ? record.hco_grouping.trim() : "Unspecified"

      if (hcoLat !== null && hcoLong !== null && record.hco_mdm) {
        // Check if this HCO is already in the location array
        const existingLocation = territoryData.locations.find((loc) => loc.id === record.hco_mdm)

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
          territoryData.locations.push({
            id: record.hco_mdm,
            name: hcoName !== "-" ? hcoName : "Unknown",
            lat: hcoLat,
            lng: hcoLong,
            zip: record.hco_postal_cd_prim,
            grouping: hcoGrouping,
            patients: new Set(record.patient_id && record.patient_id !== "-" ? [record.patient_id] : []),
            hcps: new Set(record.hcp_id && record.hcp_id !== "-" ? [record.hcp_id] : []),
            territory: territory,
          })
        }
      }
    }

    // Convert maps to count objects
    const territoryPatientCounts = {}
    const territoryHcoCounts = {}
    const territoryHcpCounts = {}
    const locationData = {}

    territoryDataMap.forEach((data, territory) => {
      territoryPatientCounts[territory] = data.patients.size
      territoryHcoCounts[territory] = data.hcos.size
      territoryHcpCounts[territory] = data.hcps.size

      // Process location data
      locationData[territory] = data.locations.map((loc) => ({
        ...loc,
        patientCount: loc.patients.size,
        hcpCount: loc.hcps.size,
        territory: territory,
      }))
    })

    // Update last valid counts if any counts are non-zero
    let hasData = false
    Object.values(territoryPatientCounts).forEach((count) => {
      if (count > 0) hasData = true
    })

    if (hasData) {
      lastValidTerritoryCounts.current = {
        patients: { ...territoryPatientCounts },
        hcos: { ...territoryHcoCounts },
        hcps: { ...territoryHcpCounts },
      }

      // Also update the cache for use after reset
      setTerritoryCountsCache({
        patients: { ...territoryPatientCounts },
        hcos: { ...territoryHcoCounts },
        hcps: { ...territoryHcpCounts },
      })
    }

    return {
      territoryPatientCounts,
      territoryHcoCounts,
      territoryHcpCounts,
      locationData,
    }
  }, [filteredMapData, zipTerritoryMapping])

  // Function to show multiple territories
  const showMultipleTerritoriesFn = (territories) => {
    logDebug(`Showing details for territories: ${territories.join(", ")}`)

    if (!mapInstanceRef.current) {
      console.error("Map not initialized")
      return
    }

    // Create territory GeoJSONs if they don't exist yet
    if (Object.keys(territoryGeoJsons).length === 0) {
      const geoJsons = createTerritoryGeoJsons()
      if (!geoJsons) {
        console.error("Territory GeoJSONs not available")
        return
      }
    }

    // Store the currently selected territories
    currentSelectedTerritoriesRef.current = [...territories]
    setSelectedTerritory(territories[0]) // Just for UI purposes

    // Notify parent component about territory selection
    if (onStateSelect) {
      // Pass the territories to the parent component
      onStateSelect(null, territories)
    }

    // Completely remove the territory layer when territories are selected
    if (territoryLayerRef.current) {
      // Remove the territory layer from the map
      if (mapInstanceRef.current.hasLayer(territoryLayerRef.current)) {
        mapInstanceRef.current.removeLayer(territoryLayerRef.current)
      }
    }

    // Calculate bounds to fit all selected territories
    const bounds = L.latLngBounds([])
    territories.forEach((territory) => {
      const territoryLayer = territoryGeoJsons[territory]
      if (territoryLayer && territoryLayer.getBounds().isValid()) {
        bounds.extend(territoryLayer.getBounds())
      } else if (territoryCenters[territory]) {
        // Fallback to approximate center if bounds not available
        const [lat, lng] = territoryCenters[territory]
        bounds.extend([lat, lng])
      }
    })

    // Zoom to fit all selected territories
    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 7,
      })
    }

    // Add territory markers
    addTerritoryMarkers(territories)

    // Hide territory labels when territories are selected
    document.querySelectorAll(".territory-label").forEach((el) => el.remove())
  }

  // Function to toggle territory selection (for multiple selection)
  const toggleTerritorySelection = (territory) => {
    let newSelection = [...currentSelectedTerritoriesRef.current]

    if (newSelection.includes(territory)) {
      // Remove territory if already selected
      newSelection = newSelection.filter((t) => t !== territory)
    } else {
      // Add territory if not already selected
      newSelection.push(territory)
    }

    // Update selection
    if (newSelection.length === 0) {
      resetTerritoryViewFn()
    } else {
      currentSelectedTerritoriesRef.current = newSelection

      // Notify parent component about territory selection
      if (onStateSelect) {
        onStateSelect(null, newSelection)
      }

      // Use setTimeout to ensure the state update happens after the current execution
      setTimeout(() => {
        if (typeof window !== "undefined") {
          // Create a custom event to notify the parent component
          const event = new CustomEvent("territorySelected", {
            detail: { territories: newSelection },
          })
          window.dispatchEvent(event)
        }
      }, 0)

      // Show the selected territories
      showMultipleTerritoriesFn(newSelection)
    }
  }

  // Function to show territory detail when clicked
  const showTerritoryDetail = (territory) => {
    // For backward compatibility, convert single territory to array
    showMultipleTerritoriesFn([territory])
  }

  // Reset the territory view
  const resetTerritoryViewFn = () => {
    logDebug("Resetting territory view")

    // Set flag to prevent recursive resets
    isResettingRef.current = true

    // Clear the selected territory reference
    currentSelectedTerritoriesRef.current = []
    setSelectedTerritory(null)

    // Notify parent component about territory deselection
    if (onStateSelect) {
      // Clear the territory selection in the parent component
      onStateSelect(null, [])
      // Use setTimeout to ensure the state update happens after the current execution
      setTimeout(() => {
        if (typeof window !== "undefined") {
          // Create a custom event to notify the parent component
          const event = new CustomEvent("territorySelected", {
            detail: { territories: [] },
          })
          window.dispatchEvent(event)
        }
      }, 0)
    }

    // Clear markers
    if (markerClusterRef.current) {
      markerClusterRef.current.clearLayers()
    }

    // Reset territory layer styles and re-add event handlers
    if (territoryLayerRef.current) {
      // Remove the layer and recreate it to reset all event handlers
      if (mapInstanceRef.current && mapInstanceRef.current.hasLayer(territoryLayerRef.current)) {
        mapInstanceRef.current.removeLayer(territoryLayerRef.current)
      }

      // Recreate the territory layer
      createTerritoryLayer()
    }

    // Reset map view to show all US
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([39.8283, -98.5795], 4)
    }

    // Update territory labels with cached counts to prevent showing zeros
    setTimeout(() => {
      addTerritoryLabels(true) // Pass true to use cached counts
      isResettingRef.current = false // Reset the flag after everything is done
    }, 300)
  }

  // Function to add markers for selected territories
  const addTerritoryMarkers = (territories) => {
    if (!Array.isArray(territories)) {
      territories = [territories]
    }

    logDebug(`Adding markers for territories: ${territories.join(", ")}`)

    if (!mapInstanceRef.current) {
      console.error("Map not initialized in addTerritoryMarkers")
      return
    }

    // Ensure territory layer is completely removed when showing markers
    if (territoryLayerRef.current && mapInstanceRef.current.hasLayer(territoryLayerRef.current)) {
      mapInstanceRef.current.removeLayer(territoryLayerRef.current)
    }

    // Clear existing markers first
    if (markerClusterRef.current) {
      markerClusterRef.current.clearLayers()
    } else {
      logDebug("Creating new marker cluster group")
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
      // Collect location data for all selected territories
      let allLocations = []
      territories.forEach((territory) => {
        const territoryLocations = locationData[territory] || []
        allLocations = [...allLocations, ...territoryLocations]
      })

      if (allLocations.length === 0) {
        logDebug(`No location data available for selected territories`)
        return
      }

      logDebug(`Adding ${allLocations.length} markers for selected territories`)

      // Filter locations to ensure they have valid coordinates AND belong to the selected territories
      const validLocations = allLocations.filter((loc) => {
        // Ensure location has valid coordinates
        if (!loc.lat || !loc.lng || isNaN(loc.lat) || isNaN(loc.lng)) return false

        // Ensure location belongs to one of the selected territories
        if (loc.zip) {
          const zipTerritory = zipTerritoryMapping[loc.zip]
          return territories.includes(zipTerritory)
        }

        return territories.includes(loc.territory) // Trust the territory data structure
      })

      // Apply HCP segment filter if selected
      let filteredLocations = validLocations

      // Always show all markers if no filters are applied
      if (!selectedHcpSegment && !selectedHcoGrouping) {
        filteredLocations = validLocations
      } else {
        // Apply HCP segment filter if selected
        if (selectedHcpSegment) {
          // This is a simplified filter - in a real implementation, you would need to check
          // if any HCPs associated with this location match the segment criteria
          filteredLocations = filteredLocations.filter((loc) => {
            // For demonstration - you would need to implement actual filtering logic
            // based on your data structure
            return true // Include all locations for now
          })
        }

        // Apply HCO grouping filter if selected
        if (selectedHcoGrouping) {
          filteredLocations = filteredLocations.filter((loc) => {
            const grouping = loc.grouping ? loc.grouping.replace(/-/g, "").trim().toUpperCase() : ""
            return (
              grouping === selectedHcoGrouping ||
              (selectedHcoGrouping === "UNSPECIFIED" && (grouping === "DELETE" || grouping === ""))
            )
          })
        }
      }

      logDebug(`Found ${filteredLocations.length} valid locations for selected territories after filtering`)

      // Then add markers for each valid location
      filteredLocations.forEach((location) => {
        // Validate coordinates
        const lat = Number.parseFloat(location.lat)
        const lng = Number.parseFloat(location.lng)

        if (isNaN(lat) || isNaN(lng)) return

        // Get the color based on grouping
        let groupKey =
          location.grouping && typeof location.grouping === "string" ? location.grouping.toUpperCase() : "UNSPECIFIED"

        // Handle DELETE case
        if (groupKey === "DELETE") groupKey = "UNSPECIFIED"

        const markerColor = groupingColors[groupKey] || groupingColors["UNSPECIFIED"]

        // Create custom icon with the appropriate color based on grouping
        const hcoIcon = L.divIcon({
          className: "custom-marker-icon",
          html: `
        <div style="
          position: relative;
          width: 30px;
          height: 30px;
          cursor: pointer;
          pointer-events: auto;
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
            interactive: true, // Ensure marker is interactive
          })

          // Use the actual name from the location data, with a fallback
          const displayName = location.name || "Healthcare Organization"
          const displayGrouping =
            location.grouping === "Unspecified" || location.grouping === "DELETE" ? "Not Specified" : location.grouping

          // Add popup with information
          marker.bindPopup(`
        <div class="p-2 text-[12px]">
          <h3 class="font-bold">${displayName}</h3>
          <p>Grouping: ${displayGrouping}</p>
          <p>HCPs: ${location.hcpCount}</p>
          <p>Patients: ${location.patientCount}</p>
          <p>ZIP: ${location.zip || "N/A"}</p>
          <p>Territory: ${location.territory}</p>
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
              Patients: ${location.patientCount}<br>
              Territory: ${location.territory}
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

          if (markerClusterRef.current) {
            markerClusterRef.current.addLayer(marker)
          }
        } catch (markerError) {
          console.error("Error creating marker:", markerError)
        }
      })
    } catch (error) {
      console.error("Error adding territory markers:", error)
    }
  }

  // Function to create territory GeoJSON from ZIP codes
  const createTerritoryGeoJsons = () => {
    if (!zipGeoJsonRef.current) {
      logDebug("Cannot create territory GeoJSON - ZIP GeoJSON not initialized")
      return null
    }

    try {
      logDebug("Creating territory GeoJSON from ZIP codes")

      // Group ZIP features by territory
      const territoriesFeatures = {}
      const zipToTerritory = {}

      // Create mapping of ZIP codes to territories
      Object.entries(territoryZipMapping).forEach(([territory, zips]) => {
        territoriesFeatures[territory] = []
        zips.forEach((zip) => {
          zipToTerritory[zip] = territory
        })
      })

      // Group features by territory
      zipGeoJsonRef.current.features.forEach((feature) => {
        const zipCode = feature.properties.ZCTA5CE10
        const territory = zipToTerritory[zipCode]

        if (territory) {
          // Add territory property to feature
          const featureWithTerritory = {
            ...feature,
            properties: {
              ...feature.properties,
              territory: territory,
            },
          }

          if (!territoriesFeatures[territory]) {
            territoriesFeatures[territory] = []
          }

          territoriesFeatures[territory].push(featureWithTerritory)
        }
      })

      // Create GeoJSON for each territory
      const geoJsons = {}
      Object.entries(territoriesFeatures).forEach(([territory, features]) => {
        if (features.length > 0) {
          const territoryGeoJson = {
            type: "FeatureCollection",
            features: features,
          }

          geoJsons[territory] = L.geoJSON(territoryGeoJson)
        }
      })

      setTerritoryGeoJsons(geoJsons)
      logDebug(`Created GeoJSON for ${Object.keys(geoJsons).length} territories`)

      return geoJsons
    } catch (error) {
      console.error("Error creating territory GeoJSON:", error)
      return {}
    }
  }

  // Function to create the territory layer
  const createTerritoryLayer = () => {
    if (!mapInstanceRef.current || !zipGeoJsonRef.current) {
      logDebug("Cannot create territory layer - map or ZIP GeoJSON not initialized")
      return
    }

    // Clear existing territory layer if it exists
    if (territoryLayerRef.current && mapInstanceRef.current.hasLayer(territoryLayerRef.current)) {
      mapInstanceRef.current.removeLayer(territoryLayerRef.current)
      territoryLayerRef.current = null
    }

    try {
      logDebug("Creating territory layer")

      // First, create a mapping of ZIP codes to their territories
      const zipToTerritory = {}
      Object.entries(territoryZipMapping).forEach(([territory, zips]) => {
        zips.forEach((zip) => {
          zipToTerritory[zip] = territory
        })
      })

      // Create a GeoJSON with territory information
      const territoryFeatures = []

      zipGeoJsonRef.current.features.forEach((feature) => {
        const zipCode = feature.properties.ZCTA5CE10
        const territory = zipToTerritory[zipCode]

        if (territory) {
          // Add territory property to feature
          const featureWithTerritory = {
            ...feature,
            properties: {
              ...feature.properties,
              territory: territory,
            },
          }

          territoryFeatures.push(featureWithTerritory)
        }
      })

      const territoryGeoJson = {
        type: "FeatureCollection",
        features: territoryFeatures,
      }

      // Create GeoJSON layer with territory coloring
      territoryLayerRef.current = L.geoJSON(territoryGeoJson, {
        style: (feature) => {
          const territory = feature.properties.territory
          const color = TERRITORY_COLORS[territory] || TERRITORY_COLORS.DEFAULT

          return {
            fillColor: color,
            weight: 1,
            opacity: 1,
            color: color, // Set the border color to match the fill color
            fillOpacity: 0.7,
          }
        },
        onEachFeature: (feature, layer) => {
          const territory = feature.properties.territory

          if (!territory) return

          // Add click event to show territory details
          layer.on({
            click: () => {
              if (territory) {
                toggleTerritorySelection(territory)
              }
            },
          })
        },
      }).addTo(mapInstanceRef.current)

      // Create territory GeoJSONs for later use
      createTerritoryGeoJsons()

      // Add territory labels after a short delay to ensure the layer is fully rendered
      setTimeout(() => {
        addTerritoryLabels()
      }, 500)

      logDebug("Territory layer created successfully")
    } catch (error) {
      console.error("Error creating territory layer:", error)
    }
  }

  // Add a new function to create territory labels
  const addTerritoryLabels = (useCache = false) => {
    if (!mapInstanceRef.current) return

    // Remove existing labels if any
    document.querySelectorAll(".territory-label").forEach((el) => el.remove())

    // If territories are selected, don't show the labels
    if (currentSelectedTerritoriesRef.current.length > 0) return

    // Create a label for each territory
    Object.entries(territoryCenters).forEach(([territory, [lat, lng, zoom]]) => {
      // First check for last valid counts, then cached counts, then current counts
      const patientCount =
        lastValidTerritoryCounts.current.patients[territory] ||
        (useCache ? territoryCountsCache.patients[territory] || 0 : territoryPatientCounts[territory] || 0)

      const hcoCount =
        lastValidTerritoryCounts.current.hcos[territory] ||
        (useCache ? territoryCountsCache.hcos[territory] || 0 : territoryHcoCounts[territory] || 0)

      // Create a custom div icon for the label
      const labelIcon = L.divIcon({
        className: "territory-label",
        html: `
          <div style="
            background-color: rgba(255, 255, 255, 0.8);
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 6px;
            text-align: center;
            border: 1px solid #ccc;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            pointer-events: none;
          ">
            <div>${territory}</div>
            <div>Patients: ${patientCount}</div>
            <div>HCOs: ${hcoCount}</div>
          </div>
        `,
        iconSize: [80, 30],
        iconAnchor: [50, 20],
      })

      // Add the label to the map
      L.marker([lat, lng], {
        icon: labelIcon,
        interactive: false,
        zIndexOffset: 1000,
      }).addTo(mapInstanceRef.current)
    })
  }

  // Clean up map instance
  const cleanupMap = () => {
    if (!mapMountedRef.current) {
      // Don't attempt cleanup if component is unmounted
      return
    }

    if (mapInstanceRef.current) {
      try {
        logDebug("Cleaning up map instance")
        // Remove marker cluster first
        if (markerClusterRef.current) {
          markerClusterRef.current.clearLayers()
          if (mapInstanceRef.current.hasLayer(markerClusterRef.current)) {
            mapInstanceRef.current.removeLayer(markerClusterRef.current)
          }
          markerClusterRef.current = null
        }

        // Remove territory layer
        if (territoryLayerRef.current) {
          if (mapInstanceRef.current.hasLayer(territoryLayerRef.current)) {
            mapInstanceRef.current.removeLayer(territoryLayerRef.current)
          }
          territoryLayerRef.current = null
        }

        // Remove map
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null

        // Only reset initialization flags if component is still mounted
        if (mapMountedRef.current) {
          mapInitializedRef.current = false
          setMapInitialized(false)
        }
      } catch (error) {
        console.error("Error cleaning up map:", error)
      }
    }

    // Clear any pending timers
    if (initTimerRef.current) {
      clearTimeout(initTimerRef.current)
      initTimerRef.current = null
    }
  }

  // Track component mount status to prevent operations after unmount
  useEffect(() => {
    mapMountedRef.current = true

    return () => {
      mapMountedRef.current = false

      // Ensure we clean up properly on unmount
      if (initTimerRef.current) {
        clearTimeout(initTimerRef.current)
        initTimerRef.current = null
      }

      // Only call cleanupMap if we have a map instance
      if (mapInstanceRef.current) {
        cleanupMap()
      }
    }
  }, [])

  // Add custom CSS to ensure the map container is visible
  useEffect(() => {
    if (typeof document !== "undefined") {
      const style = document.createElement("style")
      style.textContent = `
        #${mapContainerId.current} {
          height: 518px !important;
          width: 100% !important;
          z-index: 1;
          background-color: #f8f9fa;
          border-radius: 0.75rem;
        }
        .leaflet-container {
          height: 100% !important;
          width: 100% !important;
          z-index: 1;
        }
        .custom-marker-icon {
          pointer-events: auto !important;
        }
        .custom-marker-icon * {
          pointer-events: auto !important;
        }
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
      `
      document.head.appendChild(style)

      return () => {
        if (document.head.contains(style)) {
          document.head.removeChild(style)
        }
      }
    }
  }, [])

  // Initialize map with retry mechanism
  const initMap = () => {
    // Check if component is still mounted
    if (!mapMountedRef.current) {
      return
    }

    // Check if map is already initialized
    if (mapInstanceRef.current) {
      logDebug("Map already initialized, skipping initialization")
      return
    }

    // Check if the map container exists
    const container = document.getElementById(mapContainerId.current)
    if (!container) {
      console.error("Map container not found:", mapContainerId.current)

      // Retry initialization with exponential backoff
      if (initializationAttempts.current < maxInitAttempts) {
        initializationAttempts.current++
        const delay = Math.min(1000 * Math.pow(2, initializationAttempts.current), 10000)
        logDebug(
          `Retrying map initialization in ${delay}ms (attempt ${initializationAttempts.current}/${maxInitAttempts})`,
        )

        initTimerRef.current = setTimeout(initMap, delay)
      }
      return
    }

    // Ensure the container has dimensions
    container.style.height = "518px"
    container.style.width = "100%"

    try {
      // Check if map is already initialized to prevent duplicate initialization
      if (mapInstanceRef.current) {
        logDebug("Map already initialized, skipping initialization")
        return
      }

      logDebug("Initializing map in container:", mapContainerId.current)

      // Set flag to prevent multiple initializations
      mapInitializedRef.current = true
      setMapInitialized(true)

      // Fix for Leaflet icon issue
      if (L.Icon && L.Icon.Default) {
        delete L.Icon.Default.prototype._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
          iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
          shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
        })
      }

      // Create map instance with a try-catch block
      let map
      try {
        map = L.map(container, {
          center: [39.8283, -98.5795], // Center of the US
          zoom: 4,
          minZoom: 3,
          maxZoom: 18,
          zoomControl: true,
          worldCopyJump: true,
          maxBoundsViscosity: 1.0,
          maxBounds: [
            [-90, -180], // Southwest corner
            [90, 180], // Northeast corner
          ],
        })
      } catch (mapError) {
        console.error("Error creating map instance:", mapError)
        setError(`Error creating map: ${mapError.message}. Try refreshing the page.`)
        mapInitializedRef.current = false
        setMapInitialized(false)
        return
      }

      // Add zoom handler to fade colors on zoom
      map.on("zoomend", () => {
        const currentZoom = map.getZoom()

        // When zoomed in, reduce opacity of the layers to show street map
        if (currentZoom > 7) {
          // If territory is selected, remove background colors completely
          if (currentSelectedTerritoriesRef.current.length > 0) {
            if (territoryLayerRef.current) {
              if (mapInstanceRef.current.hasLayer(territoryLayerRef.current)) {
                mapInstanceRef.current.removeLayer(territoryLayerRef.current)
              }
            }
          } else {
            // Just fade territory layer if no territory is selected
            if (territoryLayerRef.current) {
              territoryLayerRef.current.setStyle({
                fillOpacity: Math.max(0.1, 0.7 - (currentZoom - 7) * 0.1),
                opacity: Math.max(0.1, 0.7 - (currentZoom - 7) * 0.1),
              })
            }
          }
        } else {
          // Reset opacity for normal zoom levels, but only if no territory is selected
          if (territoryLayerRef.current && currentSelectedTerritoriesRef.current.length === 0) {
            territoryLayerRef.current.setStyle({
              fillOpacity: 0.7,
              opacity: 0.7,
            })
          }
        }

        // Update territory labels on zoom
        addTerritoryLabels()
      })

      // Add tile layer with error handling
      try {
        const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          noWrap: true, // Prevent the map from repeating horizontally
          bounds: [
            [-90, -180], // Southwest corner
            [90, 180], // Northeast corner
          ],
        }).addTo(map)

        // Ensure tile layer is always on top
        tileLayer.bringToFront()
      } catch (tileError) {
        console.error("Error adding tile layer:", tileError)
        // Continue anyway, as the map might still work without tiles
      }

      // Create marker cluster group with error handling
      try {
        const markerCluster = L.markerClusterGroup({
          showCoverageOnHover: false,
          zoomToBoundsOnClick: true,
          spiderfyOnMaxZoom: true,
          removeOutsideVisibleBounds: false,
          disableClusteringAtZoom: 8,
          maxClusterRadius: 80,
        })
        map.addLayer(markerCluster)
        markerClusterRef.current = markerCluster
      } catch (clusterError) {
        console.error("Error creating marker cluster:", clusterError)
        // Continue anyway, as the map might still work without clusters
      }

      // Save map reference
      mapInstanceRef.current = map

      // Force a resize to ensure the map is properly initialized
      setTimeout(() => {
        if (mapMountedRef.current && mapInstanceRef.current) {
          try {
            map.invalidateSize(true)
          } catch (resizeError) {
            console.error("Error resizing map:", resizeError)
          }

          // Create territory layer if data is available
          if (zipGeoJsonRef.current && Object.keys(zipTerritoryMapping).length > 0) {
            try {
              createTerritoryLayer()
            } catch (layerError) {
              console.error("Error creating territory layer:", layerError)
            }
          }
        }
      }, 500) // Reduced timeout for faster initialization

      logDebug("Map initialized successfully")

      // Reset initialization attempts counter
      initializationAttempts.current = 0
    } catch (error) {
      console.error("Error initializing map:", error)
      setError("Error initializing map: " + error.message)
      mapInitializedRef.current = false
      setMapInitialized(false)

      // Retry initialization with exponential backoff
      if (initializationAttempts.current < maxInitAttempts) {
        initializationAttempts.current++
        const delay = Math.min(1000 * Math.pow(2, initializationAttempts.current), 10000)
        logDebug(
          `Retrying map initialization in ${delay}ms (attempt ${initializationAttempts.current}/${maxInitAttempts})`,
        )

        initTimerRef.current = setTimeout(initMap, delay)
      }
    }
  }

  // Initialize map with retry mechanism
  useEffect(() => {
    // Only initialize the map once
    if (mapInitializedRef.current || mapInstanceRef.current || mapInitialized) {
      return
    }

    // Clear any existing timer to prevent multiple initialization attempts
    if (initTimerRef.current) {
      clearTimeout(initTimerRef.current)
      initTimerRef.current = null
    }

    // Add a small delay to ensure the container is rendered
    initTimerRef.current = setTimeout(initMap, 500)

    // Cleanup on unmount
    return () => {
      if (initTimerRef.current) {
        clearTimeout(initTimerRef.current)
        initTimerRef.current = null
      }
    }
  }, [zipTerritoryMapping]) // Reduced dependencies to prevent re-initialization

  // Effect to create territory layer when data is loaded
  useEffect(() => {
    if (
      mapInstanceRef.current &&
      zipGeoJsonRef.current &&
      Object.keys(zipTerritoryMapping).length > 0 &&
      !territoryLayerRef.current &&
      !currentSelectedTerritoriesRef.current.length // Don't create territory layer if territories are selected
    ) {
      createTerritoryLayer()
    }
  }, [zipGeoJsonRef.current, zipTerritoryMapping])

  // Handle ZIP GeoJSON loading and territory layer creation
  useEffect(() => {
    // Only proceed if the component is mounted
    if (!mapMountedRef.current) {
      return
    }

    // If map is initialized and we have ZIP GeoJSON data and territory mapping, create the territory layer
    if (mapInstanceRef.current && zipGeoJsonRef.current && Object.keys(zipTerritoryMapping).length > 0) {
      // Use a small timeout to ensure the map is fully ready
      const timeoutId = setTimeout(() => {
        if (mapMountedRef.current && mapInstanceRef.current) {
          // Force recreation of territory layer
          if (territoryLayerRef.current && mapInstanceRef.current.hasLayer(territoryLayerRef.current)) {
            mapInstanceRef.current.removeLayer(territoryLayerRef.current)
            territoryLayerRef.current = null
          }
          createTerritoryLayer()

          // Force map to refresh
          mapInstanceRef.current.invalidateSize(true)
        }
      }, 300)

      return () => clearTimeout(timeoutId)
    }
  }, [mapInitialized, zipTerritoryMapping, mapData])

  // Add this useEffect after the other useEffects
  useEffect(() => {
    // Check if all data is loaded and map is initialized
    if (allDataLoaded && mapInstanceRef.current) {
      // Ensure territory layer is created and visible
      if (!territoryLayerRef.current && zipGeoJsonRef.current && Object.keys(zipTerritoryMapping).length > 0) {
        logDebug("Creating territory layer after all data loaded")
        createTerritoryLayer()
      } else if (territoryLayerRef.current) {
        // Make sure territory layer is visible
        if (!mapInstanceRef.current.hasLayer(territoryLayerRef.current)) {
          mapInstanceRef.current.addLayer(territoryLayerRef.current)
        }

        // Reset territory layer style to ensure visibility
        territoryLayerRef.current.setStyle({
          fillOpacity: 0.7,
          opacity: 1,
          weight: 1,
        })

        logDebug("Ensured territory layer visibility after all data loaded")
      }
    }
  }, [allDataLoaded])

  // Force update markers when HCP/HCO filters change and territory is already selected
  useEffect(() => {
    if (currentSelectedTerritoriesRef.current.length > 0 && mapInstanceRef.current) {
      // Small delay to ensure state updates have propagated
      setTimeout(() => {
        // When filters change, ensure territory layer is completely hidden
        if (territoryLayerRef.current && mapInstanceRef.current.hasLayer(territoryLayerRef.current)) {
          mapInstanceRef.current.removeLayer(territoryLayerRef.current)
        }

        addTerritoryMarkers(currentSelectedTerritoriesRef.current)
      }, 200)
    }
  }, [selectedHcpSegment, selectedHcoGrouping])

  // Add this new useEffect to ensure territory layer stays hidden when territories are selected
  useEffect(() => {
    if (currentSelectedTerritoriesRef.current.length > 0 && mapInstanceRef.current && territoryLayerRef.current) {
      // Ensure territory layer is completely hidden when territories are selected
      if (mapInstanceRef.current.hasLayer(territoryLayerRef.current)) {
        mapInstanceRef.current.removeLayer(territoryLayerRef.current)
      }

      // Re-add markers to ensure they're visible
      setTimeout(() => {
        addTerritoryMarkers(currentSelectedTerritoriesRef.current)
      }, 100)
    }
  }, [selectedTerritories, filteredData])

  // Modify the showMultipleTerritories function to update labels
  const showMultipleTerritories = showMultipleTerritoriesFn

  // Modify the resetTerritoryView function to update labels
  const resetTerritoryView = resetTerritoryViewFn

  // Modify the return statement to remove the tooltip divs since we're showing labels directly
  return (
    <div className="flex flex-col gap-4">
      {/* Map container */}
      <div
        className="relative bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
        style={{ height: "380px" }}
      >
        {/* Reset button - only show when territories are selected */}
        {currentSelectedTerritoriesRef.current.length > 0 && (
          <button
            onClick={resetTerritoryViewFn}
            className="absolute top-2 right-2 z-20 bg-white rounded-full p-1 shadow-md hover:bg-gray-100 transition-colors"
            title="Reset view"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        )}

        <div id={mapContainerId.current} style={{ height: "100%", width: "100%" }} className="rounded-xl z-0"></div>

        {/* HCO tooltip - for showing HCO info on hover */}
        <div
          className="absolute bg-white p-2 rounded shadow-md text-[10px] z-10 pointer-events-none"
          style={{
            display: zipTooltipContent ? "block" : "none",
            right: "30%",
            bottom: "10px",
            transform: "translateX(50%)",
          }}
          dangerouslySetInnerHTML={{ __html: zipTooltipContent }}
        />

        {/* Legend */}
        <div className="absolute bottom-0 right-0 bg-white p-2 rounded-md shadow-md text-xs z-10">
          <div className="mt-2 text-[10px] font-medium mb-1">HCO Types</div>
          <div className="grid grid-cols-2 gap-1">
            {Object.entries(groupingColors).map(([grouping, color]) => (
              <div key={grouping} className="flex items-center">
                <div className="w-2 h-2 mr-1" style={{ backgroundColor: color }}></div>
                <span className="text-[8px]">{grouping}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Loading indicator - only show during initial data loading or map initialization */}
        {(loading || (!mapInitialized && !error)) && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">{loading ? "Loading map data..." : "Initializing map..."}</p>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-20">
            <div className="text-center max-w-md p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 font-medium">Error loading map</p>
              <p className="text-sm text-red-500 mt-1">{error}</p>
              <button
                onClick={() => {
                  setError(null)
                  initializationAttempts.current = 0
                  mapInitializedRef.current = false
                  setMapInitialized(false)
                  setTimeout(() => {
                    if (mapMountedRef.current) {
                      // Force re-initialization
                      if (initTimerRef.current) {
                        clearTimeout(initTimerRef.current)
                      }
                      initTimerRef.current = setTimeout(() => {
                        if (mapInstanceRef.current) {
                          cleanupMap()
                        }
                        // Attempt to initialize map again
                        const container = document.getElementById(mapContainerId.current)
                        if (container && !mapInstanceRef.current) {
                          initMap()
                        }
                      }, 500)
                    }
                  }, 0)
                }}
                className="mt-3 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-sm rounded-md transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default USAMap
