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
import { FaLocationDot } from "react-icons/fa6";

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

// Color ranges for the choropleth map
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
}

// GeoJSON data for US states
const statesGeoJsonUrl = "https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json"

// Tier colors mapping
const tierColors = {
  "Tier 1": "#02c95d", // Green
  "Tier 2": "#FFC100", // Yellow/Gold
  "Tier 3": "#7030A0", // Purple
  "Tier 4": "#FF585D", // Red
}

const AccountMap = ({ onStateSelect }) => {
  const navigate = useNavigate()
  const [mapData, setMapData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tooltipContent, setTooltipContent] = useState("")
  const [selectedState, setSelectedState] = useState(null)
  const [zipTooltipContent, setZipTooltipContent] = useState("")
  const [showAllZips, setShowAllZips] = useState(false)
  const mapContainerId = useRef(`leaflet-map-container-${Math.random().toString(36).substring(2, 9)}`)
  const mapInitializedRef = useRef(false)
  const mapMountedRef = useRef(false)

  // Refs for map and layers
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const stateLayerRef = useRef(null)
  const markerClusterRef = useRef(null)
  const geoJsonLoadedRef = useRef(false)

  // Function to navigate to HCO details
  const getHCODetails = (hcoId) => {
    navigate("/hco", { state: { hco_id: hcoId } })
  }

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
      } catch (error) {
        console.error("Error fetching map data:", error)
        setError("Error fetching data: " + error.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

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

    // Process each record
    mapData.forEach((record) => {
      const hcpId = record.hcp_id
      const hcoId = record.hco_mdm
      const patientId = record.patient_id
      const hcpState = record.hcp_state
      const hcoState = record.hco_state
      const hcpZip = record.hcp_zip
      const hcoZip = record.hco_postal_cd_prim
      const hcoTier = record.hco_mdm_tier

      // Fix: Ensure we're getting the correct HCO name
      // Log the record to see what fields are available
      console.log("Record HCO name fields:", {
        hco_mdm_name: record.hco_mdm_name,
        hco_name: record.hco_name,
      })

      // Use a more robust fallback chain for HCO name
      const hcoName = record.hco_mdm_name || record.hco_name || "Healthcare Organization"

      // Ensure lat/long are valid numbers
      const hcoLat = typeof record.rend_hco_lat === "number" && !isNaN(record.rend_hco_lat) ? record.rend_hco_lat : null
      const hcoLong =
        typeof record.rend_hco_long === "number" && !isNaN(record.rend_hco_long) ? record.rend_hco_long : null

      // Process HCP data
      if (hcpId && hcpState && hcpId !== "-" && hcpState !== "-") {
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
      if (hcoId && hcoState && hcoId !== "-" && hcoState !== "-") {
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

        // Process location data if lat/long are available
        if (hcoLat !== null && hcoLong !== null) {
          if (!locationMap.has(hcoState)) {
            locationMap.set(hcoState, [])
          }

          // Check if this HCO is already in the location array
          const existingLocation = locationMap.get(hcoState).find((loc) => loc.id === hcoId)

          if (existingLocation) {
            // Update existing location
            if (patientId && patientId !== "-") {
              existingLocation.patients.add(patientId)
            }
            if (hcpId && hcpId !== "-") {
              existingLocation.hcps.add(hcpId)
            }
            // Update name if we have a better one now
            if (hcoName && hcoName !== "Healthcare Organization") {
              existingLocation.name = hcoName
            }
            // Store the tier information
            if (hcoTier && hcoTier !== "-") {
              existingLocation.tier = hcoTier
            }
          } else {
            // Add new location with the correct name and tier
            locationMap.get(hcoState).push({
              id: hcoId,
              name: hcoName,
              lat: hcoLat,
              lng: hcoLong,
              zip: hcoZip,
              tier: hcoTier !== "-" ? hcoTier : null,
              patients: new Set(patientId && patientId !== "-" ? [patientId] : []),
              hcps: new Set(hcpId && hcpId !== "-" ? [hcpId] : []),
            })
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
  }, [mapData])

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

        // First, let's add some debug logging to see what names are available
        console.log("State locations data:", stateLocations)

        // Then modify the marker creation to ensure we're using the correct name
        stateLocations.forEach((location) => {
          if (!location.lat || !location.lng || isNaN(location.lat) || isNaN(location.lng)) return

          // Skip locations with no tier or tier value of "-"
          if (!location.tier) return

          // Validate coordinates
          const lat = Number.parseFloat(location.lat)
          const lng = Number.parseFloat(location.lng)

          if (isNaN(lat) || isNaN(lng)) return

          // Debug the location name
          console.log("Location name:", location.name, "Location ID:", location.id, "Tier:", location.tier)

          // Get the color based on tier
          const markerColor = tierColors[location.tier] || "#808080" // Default gray if tier not found

          // Create custom icon with the appropriate color based on tier
          const hcoIcon = L.divIcon({
            className: "custom-marker-icon",
            html: `<div style="color: ${markerColor}; width: 24px; height: 24px; z-index: 1000;">
                    
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path fill="${markerColor}" fill-rule="evenodd" d="M11.291 21.706 12 21l-.709.706zM12 21l.708.706a1 1 0 0 1-1.417 0l-.006-.007-.017-.017-.062-.063a47.708 47.708 0 0 1-1.04-1.106 49.562 49.562 0 0 1-2.456-2.908c-.892-1.15-1.804-2.45-2.497-3.734C4.535 12.612 4 11.248 4 10c0-4.539 3.592-8 8-8 4.408 0 8 3.461 8 8 0 1.248-.535 2.612-1.213 3.87-.693 1.286-1.604 2.585-2.497 3.735a49.583 49.583 0 0 1-3.496 4.014l-.062.063-.017.017-.006.006L12 21zm0-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" clip-rule="evenodd"></path></g></svg>
                   </div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 24],
          })

          try {
            const marker = L.marker([lat, lng], {
              icon: hcoIcon,
              zIndexOffset: 1000, // Ensure markers appear above other layers
            })

            // Use the actual name from the location data, with a fallback
            const displayName = location.name || "Healthcare Organization"

            // Add popup with information
            marker.bindPopup(`
              <div class="p-2">
                <h3 class="font-bold">${displayName}</h3>
                <p>Tier: ${location.tier}</p>
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
                    Tier: ${location.tier}<br>
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
                          setSelectedState(null)
                          if (onStateSelect) onStateSelect(null)

                          // Reset view
                          mapInstanceRef.current.setView([39.8283, -98.5795], 4)

                          // Clear markers
                          if (markerClusterRef.current) {
                            markerClusterRef.current.clearLayers()
                          }
                        } else {
                          // Select state
                          setSelectedState(stateAbbr)
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
  }, [mapContainerId, colorScale, hcpStateCounts, hcoStateCounts, patientStateCounts, onStateSelect])

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
      `
      document.head.appendChild(style)

      return () => {
        if (document.head.contains(style)) {
          document.head.removeChild(style)
        }
      }
    }
  }, [])

  // Update state styles when color scale changes
  useEffect(() => {
    if (!stateLayerRef.current || !geoJsonLoadedRef.current || !mapMountedRef.current) return

    try {
      stateLayerRef.current.eachLayer((layer) => {
        const stateName = layer.feature.properties.name
        const stateAbbr = stateNameToAbbreviation[stateName]
        const patientCount = stateAbbr ? patientStateCounts[stateAbbr] || 0 : 0

        layer.setStyle({
          fillColor: patientCount > 0 ? colorScale(patientCount) : "#EEE",
        })
      })
    } catch (error) {
      console.error("Error updating state styles:", error)
    }
  }, [colorScale, patientStateCounts])

  // Also modify the useEffect for selectedState changes to ensure markers persist
  useEffect(() => {
    if (!mapInstanceRef.current || !mapMountedRef.current) return

    try {
      if (selectedState) {
        console.log("Selected state changed to:", selectedState)

        // Use a longer timeout to ensure map is fully zoomed before adding markers
        const timer = setTimeout(() => {
          if (mapInstanceRef.current && mapMountedRef.current) {
            console.log("Adding markers after state selection change")
            addStateMarkers(selectedState)
          }
        }, 800)

        return () => clearTimeout(timer)
      } else if (markerClusterRef.current) {
        markerClusterRef.current.clearLayers()
      }
    } catch (error) {
      console.error("Error updating markers on state change:", error)
    }
  }, [selectedState])

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
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return <div className="text-red-500">Error loading map data: {error}</div>
  }

  // Calculate how many ZIP codes to display
  const zipDisplayCount = showAllZips ? selectedStateZips.length : 12

  return (
    <div className="flex flex-col gap-4 h-60 ">
      {/* Map container */}
      <div className="relative bg-white rounded-xl border border-gray-200 shadow-sm">
        <div id={mapContainerId.current} style={{ height: "240px", width: "100%" }} className="rounded-xl z-0"></div>

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
        <div className="absolute bottom-4 right-4 bg-white p-2 rounded-md shadow-md text-xs z-10">
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
          <div className="flex flex-wrap mt-2 gap-1">
            <div className="text-[10px] font-medium">HCO Tiers</div>
            <div className="flex items-center">
              <div className="w-3 h-3 mr-1" style={{ backgroundColor: tierColors["Tier 1"] }}></div>
              <span className="text-[10px]">Tier 1</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 mr-1" style={{ backgroundColor: tierColors["Tier 2"] }}></div>
              <span className="text-[10px]">Tier 2</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 mr-1" style={{ backgroundColor: tierColors["Tier 3"] }}></div>
              <span className="text-[10px]">Tier 3</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 mr-1" style={{ backgroundColor: tierColors["Tier 4"] }}></div>
              <span className="text-[10px]">Tier 4</span>
            </div>
          </div>
        </div>
      </div>

      {/* ZIP code data */}
      {/* <div className="flex flex-col gap-2 w-full mt-2">
        {selectedState && (
          <>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">ZIP Codes in {stateAbbreviationToName[selectedState]}</h3>
              <button onClick={() => setShowAllZips(!showAllZips)} className="text-blue-500 text-sm hover:underline">
                {showAllZips ? "Show Less" : "Show All"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedStateZips.slice(0, zipDisplayCount).map((zipData, index) => (
                <div
                  key={index}
                  className="flex bg-blue-100 text-[#004567] w-[23%] h-8 rounded-xl text-[9px] p-[4px] items-center"
                >
                  <span>
                    ZIP: <span className="font-[500]">{zipData.zip}</span>
                  </span>
                  <div className="border-l border-gray-500 h-[15px] mx-2"></div>
                  <span>
                    HCPs: <span className="font-[500]">{zipData.hcpCount}</span>
                  </span>
                  <div className="border-l border-gray-500 h-[15px] mx-2"></div>
                  <span>
                    HCOs: <span className="font-[500]">{zipData.hcoCount}</span>
                  </span>
                  <div className="border-l border-gray-500 h-[15px] mx-2"></div>
                  <span>
                    Patients: <span className="font-[500]">{zipData.patientCount}</span>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {!selectedState && <div className="text-gray-500 text-sm">Select a state to view ZIP code data</div>}
      </div> */}
    </div>
  )
}

export default AccountMap