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
  SOUTHEAST: "#D2B48C", // Tan
  MIDWEST: "#90EE90", // Light Green
  CAPITOL: "#A0522D", // Brown
  "ROCKY MOUNTAIN": "#FF6B6B", // Red
  TEXAS: "#FFD700", // Gold
  SOUTHWEST: "#FFFF99", // Light Yellow
  "SOUTH CENTRAL": "#DEB887", // Burlywood
  "OHIO VALLEY": "#87CEEB", // Sky Blue
  "UPPER MIDWEST": "#6495ED", // Cornflower Blue
  "NEW ENGLAND": "#8B4513", // Saddle Brown
  // Fallback color
  DEFAULT: "#CCCCCC", // Light Gray
}

// HCO grouping colors mapping
const groupingColors = {
  "CURRENT IV": "#00B050", // Green
  "IV AFFILIATES": "#FFC100", // Yellow/Gold
  "NEW IT TREATMENT CENTERS": "#7030A0", // Purple
  "NEW TREATMENT CENTERS": "#FF585D", // Red
  UNSPECIFIED: "#CCCCCC", // Light gray for unspecified/missing values
}

// Approximate territory centers for positioning and zooming
const territoryCenters = {
  SOUTHEAST: [32.0, -82.0, 6],
  MIDWEST: [40.0, -90.0, 6],
  "NEW ENGLAND": [42.0, -74.0, 6],
  "SOUTH CENTRAL": [32.0, -92.0, 6],
  "UPPER MIDWEST": [44.0, -92.0, 6],
  "OHIO VALLEY": [40.0, -83.0, 6],
  CAPITOL: [39.0, -77.0, 6],
  TEXAS: [31.0, -97.0, 6],
  "ROCKY MOUNTAIN": [42.0, -110.0, 5],
  SOUTHWEST: [34.0, -115.0, 6],
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
  const mapContainerId = useRef(`map-container-${Math.random().toString(36).substring(2, 9)}`)
  const [territoryZipMapping, setTerritoryZipMapping] = useState({})
  const [zipTerritoryMapping, setZipTerritoryMapping] = useState({})
  const [territoryData, setTerritoryData] = useState({})
  const [mapInitialized, setMapInitialized] = useState(false)
  const [selectedTerritory, setSelectedTerritory] = useState(null) // Track the selected territory
  const [territoryGeoJsons, setTerritoryGeoJsons] = useState({}) // Store territory GeoJSON data
  const [allDataLoaded, setAllDataLoaded] = useState(false)

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
  const currentSelectedTerritoryRef = useRef(null)

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
        const response = await fetch(`${api}/fetch-zip`)
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
    const fetchZipGeoJson = async () => {
      try {
        logDebug("Fetching ZIP GeoJSON data")
        const response = await fetch("/usa_zip_codes_geo_15m.json")
        if (!response.ok) {
          throw new Error(`Failed to load ZIP code GeoJSON: ${response.status}`)
        }
        const data = await response.json()
        zipGeoJsonRef.current = data
        geoJsonLoadedRef.current = true
        logDebug(`Loaded ZIP GeoJSON with ${data.features.length} features`)
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
        logDebug("Fetching map data from API")
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
        dataLoadedRef.current = true
        logDebug(`Loaded ${cleanedData.length} map data records`)
      } catch (error) {
        console.error("Error fetching map data:", error)
        setError("Error fetching data: " + error.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Handle changes to selectedTerritories prop
  useEffect(() => {
    if (selectedTerritories && selectedTerritories.length > 0 && mapInstanceRef.current) {
      // If a territory is selected from the parent component, show it
      if (selectedTerritories.length === 1) {
        const territory = selectedTerritories[0]
        showTerritoryDetail(territory)
      } else {
        // If multiple territories are selected or selection is cleared, reset view
        resetTerritoryView()
      }
    }
  }, [selectedTerritories])

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
  }, [
    mapData,
    selectedState,
    selectedYears,
    selectedTerritories,
    selectedHcpSegment,
    selectedHcoGrouping,
    zipTerritoryMapping,
  ])

  // Process data to get counts by territory
  const { territoryPatientCounts, territoryHcoCounts, territoryHcpCounts, locationData } = useMemo(() => {
    if (filteredMapData.length === 0 || Object.keys(zipTerritoryMapping).length === 0) {
      return { territoryPatientCounts: {}, territoryHcoCounts: {}, territoryHcpCounts: {}, locationData: {} }
    }

    // Create maps for each territory
    const territoryPatientMap = new Map() // Map of territory -> Set of unique patient IDs
    const territoryHcoMap = new Map() // Map of territory -> Set of unique HCO IDs
    const territoryHcpMap = new Map() // Map of territory -> Set of unique HCP IDs
    const locationMap = new Map() // Map of territory -> Array of location objects

    // Process each record
    filteredMapData.forEach((record) => {
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
        // Initialize maps for this territory if they don't exist
        if (!territoryPatientMap.has(territory)) territoryPatientMap.set(territory, new Set())
        if (!territoryHcoMap.has(territory)) territoryHcoMap.set(territory, new Set())
        if (!territoryHcpMap.has(territory)) territoryHcpMap.set(territory, new Set())
        if (!locationMap.has(territory)) locationMap.set(territory, [])

        // Add patient to territory count
        if (record.patient_id && record.patient_id !== "-") {
          territoryPatientMap.get(territory).add(record.patient_id)
        }

        // Add HCO to territory count
        if (record.hco_mdm && record.hco_mdm !== "-") {
          territoryHcoMap.get(territory).add(record.hco_mdm)
        }

        // Add HCP to territory count
        if (record.hcp_id && record.hcp_id !== "-") {
          territoryHcpMap.get(territory).add(record.hcp_id)
        }

        // Process location data if lat/long are available
        const hcoLat =
          typeof record.rend_hco_lat === "number" && !isNaN(record.rend_hco_lat) ? record.rend_hco_lat : null
        const hcoLong =
          typeof record.rend_hco_long === "number" && !isNaN(record.rend_hco_long) ? record.rend_hco_long : null
        const hcoName = record.hco_mdm_name || record.hco_name || "Healthcare Organization"
        const hcoGrouping = record.hco_grouping ? record.hco_grouping.trim() : "Unspecified"

        if (hcoLat !== null && hcoLong !== null && record.hco_mdm) {
          // Check if this HCO is already in the location array
          const existingLocation = locationMap.get(territory).find((loc) => loc.id === record.hco_mdm)

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
            locationMap.get(territory).push({
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
      })
    })

    // Convert maps to count objects
    const territoryPatientCounts = {}
    territoryPatientMap.forEach((patientSet, territory) => {
      territoryPatientCounts[territory] = patientSet.size
    })

    const territoryHcoCounts = {}
    territoryHcoMap.forEach((hcoSet, territory) => {
      territoryHcoCounts[territory] = hcoSet.size
    })

    const territoryHcpCounts = {}
    territoryHcpMap.forEach((hcpSet, territory) => {
      territoryHcpCounts[territory] = hcpSet.size
    })

    // Process location data
    const locationData = {}
    locationMap.forEach((locations, territory) => {
      locationData[territory] = locations
        .filter((loc) => {
          // Ensure location belongs to this territory by checking its ZIP
          if (loc.zip) {
            const zipTerritory = zipTerritoryMapping[loc.zip]
            return zipTerritory === territory
          }
          return true // If no ZIP, trust the territory assignment from the data
        })
        .map((loc) => ({
          ...loc,
          patientCount: loc.patients.size,
          hcpCount: loc.hcps.size,
          territory: territory, // Explicitly add territory to each location
        }))
    })

    return {
      territoryPatientCounts,
      territoryHcoCounts,
      territoryHcpCounts,
      locationData,
    }
  }, [filteredMapData, zipTerritoryMapping])

  // Function to show territory detail when clicked
  const showTerritoryDetail = (territory) => {
    logDebug(`Showing detail for territory: ${territory}`)

    if (!mapInstanceRef.current || !territoryGeoJsons[territory]) {
      console.error("Map or territory GeoJSON not initialized")
      return
    }

    // Check if we're clicking the same territory that's already selected
    if (currentSelectedTerritoryRef.current === territory) {
      // Reset the view
      resetTerritoryView()
      return
    }

    // Store the currently selected territory
    currentSelectedTerritoryRef.current = territory
    setSelectedTerritory(territory)

    // Highlight the selected territory
    if (territoryLayerRef.current) {
      // First make sure the layer is still in the map
      if (!mapInstanceRef.current.hasLayer(territoryLayerRef.current)) {
        mapInstanceRef.current.addLayer(territoryLayerRef.current)
      }

      territoryLayerRef.current.eachLayer((layer) => {
        // Make all territories completely transparent when one is selected
        layer.setStyle({
          fillOpacity: 0,
          opacity: 0,
          weight: 0,
        })

        // Disable mouseover/mouseout events when a territory is selected
        layer.off("mouseover")
        layer.off("mouseout")

        // Only keep click event
        const territory = layer.feature.properties.territory
        layer.on({
          click: () => {
            if (territory) {
              showTerritoryDetail(territory)
            }
          },
        })
      })
    }

    // Calculate bounds and zoom to fit
    const territoryLayer = territoryGeoJsons[territory]
    if (territoryLayer && territoryLayer.getBounds().isValid()) {
      mapInstanceRef.current.fitBounds(territoryLayer.getBounds(), {
        padding: [50, 50],
        maxZoom: 7,
      })
    } else if (territoryCenters[territory]) {
      // Fallback to approximate center if bounds not available
      const [lat, lng, zoom] = territoryCenters[territory]
      mapInstanceRef.current.setView([lat, lng], zoom)
    }

    // Add territory markers
    addTerritoryMarkers(territory)
  }

  // Reset the territory view
  const resetTerritoryView = () => {
    logDebug("Resetting territory view")

    // Clear the selected territory reference
    currentSelectedTerritoryRef.current = null
    setSelectedTerritory(null)

    // Clear markers
    if (markerClusterRef.current) {
      markerClusterRef.current.clearLayers()
    }

    // Reset territory layer styles and re-add event handlers
    if (territoryLayerRef.current) {
      // Remove the layer and recreate it to reset all event handlers
      if (mapInstanceRef.current.hasLayer(territoryLayerRef.current)) {
        mapInstanceRef.current.removeLayer(territoryLayerRef.current)
      }

      // Recreate the territory layer
      createTerritoryLayer()
    }

    // Reset map view to show all US
    mapInstanceRef.current.setView([39.8283, -98.5795], 4)
  }

  // Function to add markers for a selected territory
  const addTerritoryMarkers = (territory) => {
    logDebug(`Adding markers for territory: ${territory}`)

    if (!mapInstanceRef.current) {
      console.error("Map not initialized in addTerritoryMarkers")
      return
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
      // Get location data ONLY for the selected territory
      const territoryLocations = locationData[territory] || []

      if (territoryLocations.length === 0) {
        logDebug(`No location data available for territory: ${territory}`)
        return
      }

      logDebug(`Adding ${territoryLocations.length} markers for ${territory}`)

      // Filter locations to ensure they have valid coordinates AND belong to the selected territory
      const validLocations = territoryLocations.filter((loc) => {
        // Ensure location has valid coordinates
        if (!loc.lat || !loc.lng || isNaN(loc.lat) || isNaN(loc.lng)) return false

        // Ensure location belongs to the selected territory
        // Check if the ZIP code belongs to the selected territory
        if (loc.zip) {
          const zipTerritory = zipTerritoryMapping[loc.zip]
          return zipTerritory === territory
        }

        return true // If no ZIP code, include it (we'll trust the territory data structure)
      })

      logDebug(`Found ${validLocations.length} valid locations for territory ${territory}`)

      // Then add markers for each valid location
      validLocations.forEach((location) => {
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
        // Modified to ensure the entire marker is clickable
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
            <p>Territory: ${territory}</p>
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
                Territory: ${territory}
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
      return
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

          const patientCount = territoryPatientCounts[territory] || 0
          const hcoCount = territoryHcoCounts[territory] || 0
          const hcpCount = territoryHcpCounts[territory] || 0

          layer.on({
            mouseover: (e) => {
              // Only show territory-level tooltips when no territory is selected
              if (!currentSelectedTerritoryRef.current) {
                const layer = e.target
                layer.setStyle({
                  weight: 2,
                  color: "#666",
                  fillOpacity: 0.9,
                })
                layer.bringToFront()

                // Only show territory info
                setTooltipContent(`
                  <strong>Territory: ${territory || "N/A"}</strong><br>
                  Patient Count: ${patientCount}<br>
                  HCO Count: ${hcoCount}<br>
                  HCP Count: ${hcpCount}
                `)
              }
            },
            mouseout: (e) => {
              if (!currentSelectedTerritoryRef.current) {
                // Only reset style if no territory is selected
                territoryLayerRef.current.resetStyle(e.target)
              }
              setTooltipContent("")
            },
            click: () => {
              if (territory) {
                showTerritoryDetail(territory)
              }
            },
          })
        },
      }).addTo(mapInstanceRef.current)

      // Create territory GeoJSONs for later use
      createTerritoryGeoJsons()

      logDebug("Territory layer created successfully")
    } catch (error) {
      console.error("Error creating territory layer:", error)
    }
  }

  // Clean up map instance
  const cleanupMap = () => {
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
        mapInitializedRef.current = false
        setMapInitialized(false)
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
      cleanupMap()
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
      `
      document.head.appendChild(style)

      return () => {
        if (document.head.contains(style)) {
          document.head.removeChild(style)
        }
      }
    }
  }, [])

  // Initialize map
  useEffect(() => {
    // Only initialize the map once
    if (mapInitializedRef.current || mapInstanceRef.current || mapInitialized) {
      return
    }

    const initMap = () => {
      // Check if the map container exists
      const container = document.getElementById(mapContainerId.current)
      if (!container) {
        console.error("Map container not found:", mapContainerId.current)
        return
      }

      // Ensure the container has dimensions
      container.style.height = "518px"
      container.style.width = "100%"

      try {
        logDebug("Initializing map in container:", mapContainerId.current)

        // Set flag to prevent multiple initializations
        mapInitializedRef.current = true
        setMapInitialized(true)

        // Fix for Leaflet icon issue
        delete L.Icon.Default.prototype._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        })

        // Create map instance
        const map = L.map(container, {
          center: [39.8283, -98.5795], // Center of the US
          zoom: 4,
          minZoom: 3,
          maxZoom: 18,
          zoomControl: true,
          worldCopyJump: true,
        })

        // Add zoom handler to fade colors on zoom
        map.on("zoomend", () => {
          const currentZoom = map.getZoom()

          // When zoomed in, reduce opacity of the layers to show street map
          if (currentZoom > 7) {
            // Fade territory layer
            if (territoryLayerRef.current) {
              territoryLayerRef.current.setStyle({
                fillOpacity: Math.max(0.1, 0.7 - (currentZoom - 7) * 0.1),
                opacity: Math.max(0.1, 0.7 - (currentZoom - 7) * 0.1),
              })
            }
          } else {
            // Reset opacity for normal zoom levels
            if (territoryLayerRef.current && !currentSelectedTerritoryRef.current) {
              territoryLayerRef.current.setStyle({
                fillOpacity: 0.7,
                opacity: 0.7,
              })
            }
          }
        })

        // Add tile layer and store reference
        const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map)

        // Ensure tile layer is always on top
        tileLayer.bringToFront()

        // Create marker cluster group
        const markerCluster = L.markerClusterGroup({
          showCoverageOnHover: false,
          zoomToBoundsOnClick: true,
          spiderfyOnMaxZoom: true,
          disableClusteringAtZoom: 8,
          maxClusterRadius: 80,
        })
        map.addLayer(markerCluster)

        // Save references
        mapInstanceRef.current = map
        markerClusterRef.current = markerCluster

        // Force a resize to ensure the map is properly initialized
        setTimeout(() => {
          map.invalidateSize(true)

          // Create territory layer if data is available
          if (zipGeoJsonRef.current && Object.keys(zipTerritoryMapping).length > 0) {
            createTerritoryLayer()
          }
        }, 500)

        logDebug("Map initialized successfully")
      } catch (error) {
        console.error("Error initializing map:", error)
        setError("Error initializing map: " + error.message)
        mapInitializedRef.current = false
        setMapInitialized(false)
      }
    }

    // Add a small delay to ensure the container is rendered
    setTimeout(initMap, 500)

    // Cleanup on unmount
    return () => {
      cleanupMap()
    }
  }, [selectedTerritories, territoryZipMapping, zipTerritoryMapping, mapInitialized])

  // Effect to create territory layer when data is loaded
  useEffect(() => {
    if (
      mapInstanceRef.current &&
      zipGeoJsonRef.current &&
      Object.keys(zipTerritoryMapping).length > 0 &&
      !territoryLayerRef.current
    ) {
      createTerritoryLayer()
    }
  }, [zipGeoJsonRef.current, zipTerritoryMapping])

  // Track when all data is loaded
  useEffect(() => {
    // Check if map is initialized and data is loaded
    if (mapInitialized && !loading && Object.keys(zipTerritoryMapping).length > 0) {
      // Set all data loaded immediately without delay
      setAllDataLoaded(true)
    }
  }, [mapInitialized, loading, zipTerritoryMapping])

  return (
    <div className="flex flex-col gap-4">
      {/* Map container */}
      <div
        className="relative bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
        style={{ height: "518px" }}
      >
        {/* Reset button - only show when a territory is selected */}
        {selectedTerritory && (
          <button
            onClick={resetTerritoryView}
            className="absolute top-2 right-2 z-20 bg-white rounded-full p-1 shadow-md hover:bg-gray-100 transition-colors"
            title="Reset view"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        )}

        <div id={mapContainerId.current} style={{ height: "100%", width: "100%" }} className="rounded-xl z-0"></div>

        {/* Territory tooltip */}
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
          {/* <div className="text-[10px] font-medium mb-1">Territories</div>
          <div className="grid grid-cols-2 gap-1">
            {Object.entries(TERRITORY_COLORS)
              .filter(([key]) => key !== "DEFAULT")
              .map(([territory, color]) => (
                <div key={territory} className="flex items-center">
                  <div className="w-3 h-3 mr-1" style={{ backgroundColor: color }}></div>
                  <span className="text-[8px]">{territory}</span>
                </div>
              ))}
          </div> */}
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
        {/* Loading indicator - only show during initial data loading */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Loading map data...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default USAMap
