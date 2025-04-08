"use client"

import React, { useState, useEffect, useRef, useMemo } from "react"
import { ChevronDown, Search, Loader } from "lucide-react"
import { MapContainer, TileLayer, Marker, Tooltip, Polyline, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import JSONData from "../../data/refer.json"

// Custom icons for the map
const createMapIcon = (iconUrl, iconSize) => {
  return L.icon({
    iconUrl,
    iconSize: [iconSize, iconSize],
    iconAnchor: [iconSize / 2, iconSize],
    popupAnchor: [0, -iconSize],
  })
}

// Location marker icon for rendering HCPs/HCOs
const locationIcon = createMapIcon("/location-marker.svg", 30)

// Stethoscope icon for referring HCPs/HCOs
const stethoscopeIcon = createMapIcon("/stethoscope.svg", 30)

// Map bounds controller component
const MapBoundsController = ({ bounds }) => {
  const map = useMap()

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds)
    }
  }, [bounds, map])

  return null
}

// Map markers component for better performance
const MapMarkers = ({ referringMarkers, renderingMarkers, mapConnections, selectedEntity }) => {
  return (
    <>
      {/* Render referring markers */}
      {referringMarkers.map((marker, index) => (
        <Marker key={`ref-${index}`} position={marker.position} icon={stethoscopeIcon}>
          <Tooltip permanent={selectedEntity.referring === marker.name}>
            <div className="text-xs">
              <strong>{marker.name}</strong>
              <div>Patients: {marker.count}</div>
            </div>
          </Tooltip>
        </Marker>
      ))}

      {/* Render rendering markers */}
      {renderingMarkers.map((marker, index) => (
        <Marker key={`rend-${index}`} position={marker.position} icon={locationIcon}>
          <Tooltip permanent={selectedEntity.rendering === marker.name}>
            <div className="text-xs">
              <strong>{marker.name}</strong>
              <div>Patients: {marker.count}</div>
            </div>
          </Tooltip>
        </Marker>
      ))}

      {/* Render connections */}
      {mapConnections.map((connection) => (
        <React.Fragment key={connection.id}>
          <Polyline
            positions={[connection.refPosition, connection.rendPosition]}
            pathOptions={{
              color: "blue",
              weight: 2,
              dashArray: "5, 5",
              opacity: 0.7,
            }}
          />
          {/* Patient count label in the middle of the line */}
          <Marker
            position={[
              (connection.refPosition[0] + connection.rendPosition[0]) / 2,
              (connection.refPosition[1] + connection.rendPosition[1]) / 2,
            ]}
            icon={L.divIcon({
              html: `<div class="bg-white px-2 py-1 rounded-full border border-blue-500 text-xs font-bold">${connection.patientCount}</div>`,
              className: "patient-count-label",
              iconSize: [40, 20],
              iconAnchor: [20, 10],
            })}
          />
        </React.Fragment>
      ))}
    </>
  )
}

const ReferOut = ({ referType = "HCP" }) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterLoading, setFilterLoading] = useState(false)
  const [error, setError] = useState(null)
  const [filteredData, setFilteredData] = useState([])
  const [mapReady, setMapReady] = useState(false)

  // State for filters - different filters based on referType
  const [filters, setFilters] = useState({
    // Common filters
    state: "All",
    organizationFilter: "All", // "All", "Within", "Outside"

    // HCP filters
    hcpType: "All",
    hcpSpecialty: "All",

    // HCO filters
    hcoTier: "All",
    hcoArchetype: "All",
  })

  // State for filter options
  const [filterOptions, setFilterOptions] = useState({
    // Common filter options
    states: ["All"],

    // HCP filter options
    hcpTypes: ["All"],
    hcpSpecialties: ["All"],

    // HCO filter options
    hcoTiers: ["All"],
    hcoArchetypes: ["All"],
  })

  // State for dropdown visibility
  const [openDropdown, setOpenDropdown] = useState(null)

  // State for search terms
  const [searchTerms, setSearchTerms] = useState({
    referring: "",
    rendering: "",
  })

  // State for selected entities
  const [selectedEntity, setSelectedEntity] = useState({
    referring: null,
    rendering: null,
  })

  // Refs for map
  const mapRef = useRef(null)

  // Clean data by removing NaN, "-", etc.
  const cleanData = (rawData) => {
    return rawData.map((item) => {
      const cleanedItem = {}

      // Process each property
      Object.entries(item).forEach(([key, value]) => {
        if (value === "-" || value === "" || value === null || (typeof value === "number" && isNaN(value))) {
          cleanedItem[key] = null
        } else {
          cleanedItem[key] = value
        }
      })

      return cleanedItem
    })
  }

  // Load data from local JSON file
  useEffect(() => {
    try {
      setLoading(true) // Set loading to true when referType changes
      setFilterLoading(true) // Also set filter loading
      setSelectedEntity({ referring: null, rendering: null })
      setSearchTerms({ referring: "", rendering: "" })
      setMapReady(false) // Reset map ready state

      // Add a small delay to ensure UI shows loading state
      setTimeout(() => {
        // Clean the data from the imported JSON
        const cleanedData = cleanData(JSONData)
        setData(cleanedData)

        // Extract common filter options
        const states = [
          "All",
          ...new Set([
            ...cleanedData.map((item) => item.hco_state).filter(Boolean),
            ...cleanedData.map((item) => item.ref_hco_state).filter(Boolean),
          ]),
        ]

        // Extract filter options based on referType
        if (referType === "HCP") {
          const hcpTypes = ["All", ...new Set(cleanedData.map((item) => item.hcp_segment).filter(Boolean))]
          const hcpSpecialties = ["All", ...new Set(cleanedData.map((item) => item.final_spec).filter(Boolean))]

          setFilterOptions((prev) => ({
            ...prev,
            states,
            hcpTypes,
            hcpSpecialties,
          }))

          // Reset HCP-specific filters
          setFilters((prev) => ({
            ...prev,
            state: "All",
            organizationFilter: "All",
            hcpType: "All",
            hcpSpecialty: "All",
          }))
        } else {
          // HCO filters
          const hcoTiers = ["All", ...new Set(cleanedData.map((item) => item.hco_mdm_tier).filter(Boolean))]
          const hcoArchetypes = ["All", ...new Set(cleanedData.map((item) => item.hco_grouping).filter(Boolean))]

          setFilterOptions((prev) => ({
            ...prev,
            states,
            hcoTiers,
            hcoArchetypes,
          }))

          // Reset HCO-specific filters
          setFilters((prev) => ({
            ...prev,
            state: "All",
            organizationFilter: "All",
            hcoTier: "All",
            hcoArchetype: "All",
          }))
        }

        // Set filtered data initially to all data
        setFilteredData(cleanedData)

        setLoading(false)
        setFilterLoading(false)
      }, 300) // Add a small delay for better UX
    } catch (err) {
      console.error("Error processing data:", err)
      setError("Failed to process data. Please check the JSON format.")
      setLoading(false)
      setFilterLoading(false)
    }
  }, [referType]) // Re-run when referType changes

  // Apply filters to data - using useEffect with a debounce for better performance
  useEffect(() => {
    if (data.length === 0) return

    setFilterLoading(true)

    // Use setTimeout to prevent UI blocking
    const timeoutId = setTimeout(() => {
      try {
        let filtered = [...data]

        // Apply state filter (common for both HCP and HCO)
        if (filters.state !== "All") {
          filtered = filtered.filter((item) => item.hco_state === filters.state || item.ref_hco_state === filters.state)
        }

        // Apply organization filter (common for both HCP and HCO)
        if (filters.organizationFilter !== "All") {
          if (referType === "HCP") {
            // For HCP view, compare referring HCP's organization with rendering HCP's organization
            if (filters.organizationFilter === "Within") {
              // Only include referrals within the same organization
              filtered = filtered.filter(
                (item) =>
                  item.ref_organization_mdm_name &&
                  item.hco_mdm_name &&
                  item.ref_organization_mdm_name === item.hco_mdm_name,
              )
            } else if (filters.organizationFilter === "Outside") {
              // Only include referrals to different organizations
              filtered = filtered.filter(
                (item) =>
                  item.ref_organization_mdm_name &&
                  item.hco_mdm_name &&
                  item.ref_organization_mdm_name !== item.hco_mdm_name,
              )
            }
          } else {
            // For HCO view, compare referring HCO with rendering HCO
            if (filters.organizationFilter === "Within") {
              // Only include referrals within the same organization
              filtered = filtered.filter(
                (item) =>
                  item.ref_organization_mdm_name &&
                  item.hco_mdm_name &&
                  item.ref_organization_mdm_name === item.hco_mdm_name,
              )
            } else if (filters.organizationFilter === "Outside") {
              // Only include referrals to different organizations
              filtered = filtered.filter(
                (item) =>
                  item.ref_organization_mdm_name &&
                  item.hco_mdm_name &&
                  item.ref_organization_mdm_name !== item.hco_mdm_name,
              )
            }
          }
        }

        // Apply HCP-specific filters
        if (referType === "HCP") {
          // Apply HCP type filter
          if (filters.hcpType !== "All") {
            filtered = filtered.filter((item) => item.hcp_segment === filters.hcpType)
          }

          // Apply HCP specialty filter
          if (filters.hcpSpecialty !== "All") {
            filtered = filtered.filter((item) => item.final_spec === filters.hcpSpecialty)
          }
        } else {
          // Apply HCO-specific filters
          // Apply HCO tier filter
          if (filters.hcoTier !== "All") {
            filtered = filtered.filter((item) => item.hco_mdm_tier === filters.hcoTier)
          }

          // Apply HCO archetype filter
          if (filters.hcoArchetype !== "All") {
            filtered = filtered.filter((item) => item.hco_grouping === filters.hcoArchetype)
          }
        }

        // Apply selected entity filters
        if (selectedEntity.referring) {
          if (referType === "HCP") {
            filtered = filtered.filter((item) => item.ref_name === selectedEntity.referring)
          } else {
            filtered = filtered.filter((item) => item.ref_organization_mdm_name === selectedEntity.referring)
          }
        }

        if (selectedEntity.rendering) {
          if (referType === "HCP") {
            filtered = filtered.filter((item) => item.hcp_name === selectedEntity.rendering)
          } else {
            filtered = filtered.filter((item) => item.hco_mdm_name === selectedEntity.rendering)
          }
        }

        setFilteredData(filtered)
      } catch (err) {
        console.error("Error filtering data:", err)
      } finally {
        setFilterLoading(false)
      }
    }, 50) // Shorter timeout for better responsiveness

    return () => clearTimeout(timeoutId)
  }, [data, filters, selectedEntity, referType])

  // Handle filter changes
  const handleFilterChange = (filterName, value) => {
    // Show loading immediately
    setFilterLoading(true)

    // Use requestAnimationFrame to ensure the UI updates before processing
    requestAnimationFrame(() => {
      setFilters((prev) => ({
        ...prev,
        [filterName]: value,
      }))

      // Close dropdown after selection
      setOpenDropdown(null)
    })
  }

  // Toggle dropdown
  const toggleDropdown = (dropdown) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown)
  }

  // Handle search term changes
  const handleSearchChange = (side, value) => {
    setSearchTerms((prev) => ({
      ...prev,
      [side]: value,
    }))
  }

  // Handle entity selection
  const handleEntitySelect = (side, entity) => {
    // Show loading immediately
    setFilterLoading(true)

    // Use requestAnimationFrame to ensure the UI updates before processing
    requestAnimationFrame(() => {
      setSelectedEntity((prev) => ({
        ...prev,
        [side]: prev[side] === entity ? null : entity,
      }))
    })
  }

  // Handle organization filter button click
  const handleOrganizationFilterClick = (value) => {
    setFilterLoading(true)

    requestAnimationFrame(() => {
      setFilters((prev) => ({
        ...prev,
        organizationFilter: prev.organizationFilter === value ? "All" : value,
      }))
    })
  }

  // Memoized referring entities with counts
  const referringEntities = useMemo(() => {
    const entityMap = new Map()

    filteredData.forEach((item) => {
      const entityName = referType === "HCP" ? item.ref_name : item.ref_organization_mdm_name

      // Skip if entity name is null or ref_npi is null
      if (!entityName || !item.ref_npi) return

      if (!entityMap.has(entityName)) {
        entityMap.set(entityName, new Set())
      }

      // Add patient to the set if it exists
      if (item.patient_id) {
        entityMap.get(entityName).add(item.patient_id)
      }
    })

    // Convert to array and sort by count
    return Array.from(entityMap.entries())
      .map(([name, patients]) => ({
        name,
        count: patients.size,
      }))
      .sort((a, b) => b.count - a.count)
      .filter((entity) => {
        // Apply search filter
        if (!searchTerms.referring) return true
        return entity.name.toLowerCase().includes(searchTerms.referring.toLowerCase())
      })
  }, [filteredData, referType, searchTerms.referring])

  // Memoized rendering entities with counts
  const renderingEntities = useMemo(() => {
    const entityMap = new Map()

    filteredData.forEach((item) => {
      const entityName = referType === "HCP" ? item.hcp_name : item.hco_mdm_name

      // Skip if entity name is null
      if (!entityName) return

      // Only count if ref_npi exists (patient was referred)
      if (!item.ref_npi) return

      if (!entityMap.has(entityName)) {
        entityMap.set(entityName, new Set())
      }

      // Add patient to the set if it exists
      if (item.patient_id) {
        entityMap.get(entityName).add(item.patient_id)
      }
    })

    // Convert to array and sort by count
    return Array.from(entityMap.entries())
      .map(([name, patients]) => ({
        name,
        count: patients.size,
      }))
      .sort((a, b) => b.count - a.count)
      .filter((entity) => {
        // Apply search filter
        if (!searchTerms.rendering) return true
        return entity.name.toLowerCase().includes(searchTerms.rendering.toLowerCase())
      })
  }, [filteredData, referType, searchTerms.rendering])

  // Memoized map connections
  const mapConnections = useMemo(() => {
    const connections = []
    const processedPairs = new Set()

    filteredData.forEach((item) => {
      // Skip if missing required data
      if (!item.ref_npi || !item.rend_hco_lat || !item.rend_hco_long || !item.ref_hco_lat || !item.ref_hco_long) {
        return
      }

      const refName = referType === "HCP" ? item.ref_name : item.ref_organization_mdm_name
      const rendName = referType === "HCP" ? item.hcp_name : item.hco_mdm_name

      // Skip if names are missing
      if (!refName || !rendName) return

      // Create a unique key for this connection
      const connectionKey = `${refName}-${rendName}`

      // Skip if we've already processed this pair
      if (processedPairs.has(connectionKey)) return
      processedPairs.add(connectionKey)

      // Count patients for this connection
      const patientCount = filteredData.filter((d) => {
        const dRefName = referType === "HCP" ? d.ref_name : d.ref_organization_mdm_name
        const dRendName = referType === "HCP" ? d.hcp_name : d.hco_mdm_name
        return dRefName === refName && dRendName === rendName && d.patient_id
      }).length

      connections.push({
        id: connectionKey,
        refName,
        rendName,
        refPosition: [item.ref_hco_lat, item.ref_hco_long],
        rendPosition: [item.rend_hco_lat, item.rend_hco_long],
        patientCount,
      })
    })

    return connections
  }, [filteredData, referType])

  // Memoized referring markers
  const referringMarkers = useMemo(() => {
    const markers = new Map()

    filteredData.forEach((item) => {
      // Skip if missing required data
      if (!item.ref_npi || !item.ref_hco_lat || !item.ref_hco_long) return

      const entityName = referType === "HCP" ? item.ref_name : item.ref_organization_mdm_name

      // Skip if entity name is null
      if (!entityName) return

      if (!markers.has(entityName)) {
        markers.set(entityName, {
          name: entityName,
          position: [item.ref_hco_lat, item.ref_hco_long],
          patients: new Set(),
        })
      }

      // Add patient to the set if it exists
      if (item.patient_id) {
        markers.get(entityName).patients.add(item.patient_id)
      }
    })

    // Convert to array and add count
    return Array.from(markers.values()).map((marker) => ({
      ...marker,
      count: marker.patients.size,
    }))
  }, [filteredData, referType])

  // Memoized rendering markers
  const renderingMarkers = useMemo(() => {
    const markers = new Map()

    filteredData.forEach((item) => {
      // Skip if missing required data
      if (!item.rend_hco_lat || !item.rend_hco_long) return

      const entityName = referType === "HCP" ? item.hcp_name : item.hco_mdm_name

      // Skip if entity name is null
      if (!entityName) return

      if (!markers.has(entityName)) {
        markers.set(entityName, {
          name: entityName,
          position: [item.rend_hco_lat, item.rend_hco_long],
          patients: new Set(),
        })
      }

      // Add patient to the set if it exists and was referred
      if (item.patient_id && item.ref_npi) {
        markers.get(entityName).patients.add(item.patient_id)
      }
    })

    // Convert to array and add count
    return Array.from(markers.values()).map((marker) => ({
      ...marker,
      count: marker.patients.size,
    }))
  }, [filteredData, referType])

  // Memoized map bounds
  const mapBounds = useMemo(() => {
    const allMarkers = [...referringMarkers, ...renderingMarkers]

    if (allMarkers.length === 0) {
      // Default to US bounds if no markers
      return [
        [24.396308, -125.0],
        [49.384358, -66.93457],
      ]
    }

    const lats = allMarkers.map((marker) => marker.position[0])
    const lngs = allMarkers.map((marker) => marker.position[1])

    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)

    // Add padding
    const padding = 0.5
    return [
      [minLat - padding, minLng - padding],
      [maxLat + padding, maxLng + padding],
    ]
  }, [referringMarkers, renderingMarkers])

  // Reset all filters and selections
  const resetFilters = () => {
    // Show loading immediately
    setFilterLoading(true)

    // Use requestAnimationFrame to ensure the UI updates before processing
    requestAnimationFrame(() => {
      // Reset common filters
      setFilters((prev) => ({
        ...prev,
        state: "All",
        organizationFilter: "All",
        ...(referType === "HCP" ? { hcpType: "All", hcpSpecialty: "All" } : { hcoTier: "All", hcoArchetype: "All" }),
      }))

      setSelectedEntity({
        referring: null,
        rendering: null,
      })

      setSearchTerms({
        referring: "",
        rendering: "",
      })
    })
  }

  // Handle map ready state
  const handleMapReady = () => {
    setMapReady(true)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-red-500">{error}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2 flex-wrap">
          {/* Common Filters - State Filter */}
          <div className="relative">
            <div
              className={`flex py-2 px-2 bg-white rounded-xl gap-2 items-center border-b border-x ${
                filters.state !== "All" ? "border-[#0460A9] bg-blue-50" : "border-gray-300"
              } cursor-pointer transition-colors duration-150`}
              onClick={() => toggleDropdown("state")}
            >
              <span
                className={`text-[11px] ${filters.state !== "All" ? "text-[#0460A9] font-medium" : "text-gray-600"}`}
              >
                State: {filters.state}
              </span>
              <ChevronDown className={`w-4 h-4 ${filters.state !== "All" ? "text-[#0460A9]" : "text-gray-500"}`} />
            </div>
            {openDropdown === "state" && (
              <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-md z-[60] w-48 max-h-40 overflow-y-auto">
                {filterOptions.states.map((state, i) => (
                  <div
                    key={i}
                    className={`p-2 text-[12px] hover:bg-gray-100 cursor-pointer ${
                      filters.state === state ? "bg-blue-50 text-blue-600" : ""
                    }`}
                    onClick={() => handleFilterChange("state", state)}
                  >
                    {state}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Organization Filter Buttons */}
          <div className="flex items-center gap-1 bg-white rounded-xl border-b border-x border-gray-300 p-1">
            <span className="text-[11px] text-gray-600 px-1">Organization:</span>
            <button
              className={`text-[11px] px-2 py-1 rounded-md transition-colors ${
                filters.organizationFilter === "Within"
                  ? "bg-[#0460A9] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              onClick={() => handleOrganizationFilterClick("Within")}
            >
              Within
            </button>
            <button
              className={`text-[11px] px-2 py-1 rounded-md transition-colors ${
                filters.organizationFilter === "Outside"
                  ? "bg-[#0460A9]  text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              onClick={() => handleOrganizationFilterClick("Outside")}
            >
              Outside
            </button>
          </div>

          {referType === "HCP" ? (
            // HCP Filters
            <>
              {/* HCP Type Filter */}
              <div className="relative">
                <div
                  className={`flex py-2 px-2 bg-white rounded-xl gap-2 items-center border-b border-x ${
                    filters.hcpType !== "All" ? "border-[#0460A9] bg-blue-50" : "border-gray-300"
                  } cursor-pointer transition-colors duration-150`}
                  onClick={() => toggleDropdown("hcpType")}
                >
                  <span
                    className={`text-[11px] ${filters.hcpType !== "All" ? "text-[#0460A9] font-medium" : "text-gray-600"}`}
                  >
                    HCP Type: {filters.hcpType}
                  </span>
                  <ChevronDown className={`w-4 h-4 ${filters.hcpType !== "All" ? "text-[#0460A9]" : "text-gray-500"}`} />
                </div>
                {openDropdown === "hcpType" && (
                  <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-md z-[1000] w-48 max-h-40 overflow-y-auto">
                    {filterOptions.hcpTypes.map((type, i) => (
                      <div
                        key={i}
                        className={`p-2 text-[12px] hover:bg-gray-100 cursor-pointer ${
                          filters.hcpType === type ? "bg-blue-50 text-blue-600" : ""
                        }`}
                        onClick={() => handleFilterChange("hcpType", type)}
                      >
                        {type}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* HCP Specialty Filter */}
              <div className="relative">
                <div
                  className={`flex py-2 px-2 bg-white rounded-xl gap-2 items-center border-b border-x ${
                    filters.hcpSpecialty !== "All" ? "border-[#0460A9] bg-blue-50" : "border-gray-300"
                  } cursor-pointer transition-colors duration-150`}
                  onClick={() => toggleDropdown("hcpSpecialty")}
                >
                  <span
                    className={`text-[11px] ${filters.hcpSpecialty !== "All" ? "text-[#0460A9] font-medium" : "text-gray-600"}`}
                  >
                    HCP Specialty: {filters.hcpSpecialty}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 ${filters.hcpSpecialty !== "All" ? "text-[#0460A9]" : "text-gray-500"}`}
                  />
                </div>
                {openDropdown === "hcpSpecialty" && (
                  <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-md z-[1000] w-48 max-h-40 overflow-y-auto">
                    {filterOptions.hcpSpecialties.map((specialty, i) => (
                      <div
                        key={i}
                        className={`p-2 text-[12px] hover:bg-gray-100 cursor-pointer ${
                          filters.hcpSpecialty === specialty ? "bg-blue-50 text-blue-600" : ""
                        }`}
                        onClick={() => handleFilterChange("hcpSpecialty", specialty)}
                      >
                        {specialty}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            // HCO Filters
            <>
              {/* HCO Tier Filter */}
              <div className="relative">
                <div
                  className={`flex py-2 px-2 bg-white rounded-xl gap-2 items-center border-b border-x ${
                    filters.hcoTier !== "All" ? "border-blue-400 bg-blue-50" : "border-gray-300"
                  } cursor-pointer transition-colors duration-150`}
                  onClick={() => toggleDropdown("hcoTier")}
                >
                  <span
                    className={`text-[11px] ${filters.hcoTier !== "All" ? "text-blue-600 font-medium" : "text-gray-600"}`}
                  >
                    HCO Tier: {filters.hcoTier}
                  </span>
                  <ChevronDown className={`w-4 h-4 ${filters.hcoTier !== "All" ? "text-blue-500" : "text-gray-500"}`} />
                </div>
                {openDropdown === "hcoTier" && (
                  <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-md z-[60] w-48 max-h-40 overflow-y-auto">
                    {filterOptions.hcoTiers.map((tier, i) => (
                      <div
                        key={i}
                        className={`p-2 text-[12px] hover:bg-gray-100 cursor-pointer ${
                          filters.hcoTier === tier ? "bg-blue-50 text-blue-600" : ""
                        }`}
                        onClick={() => handleFilterChange("hcoTier", tier)}
                      >
                        {tier}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* HCO Archetype Filter */}
              <div className="relative">
                <div
                  className={`flex py-2 px-2 bg-white rounded-xl gap-2 items-center border-b border-x ${
                    filters.hcoArchetype !== "All" ? "border-blue-400 bg-blue-50" : "border-gray-300"
                  } cursor-pointer transition-colors duration-150`}
                  onClick={() => toggleDropdown("hcoArchetype")}
                >
                  <span
                    className={`text-[11px] ${filters.hcoArchetype !== "All" ? "text-blue-600 font-medium" : "text-gray-600"}`}
                  >
                    Account Archetype: {filters.hcoArchetype}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 ${filters.hcoArchetype !== "All" ? "text-blue-500" : "text-gray-500"}`}
                  />
                </div>
                {openDropdown === "hcoArchetype" && (
                  <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-md z-[60] w-48 max-h-40 overflow-y-auto">
                    {filterOptions.hcoArchetypes.map((archetype, i) => (
                      <div
                        key={i}
                        className={`p-2 text-[12px] hover:bg-gray-100 cursor-pointer ${
                          filters.hcoArchetype === archetype ? "bg-blue-50 text-blue-600" : ""
                        }`}
                        onClick={() => handleFilterChange("hcoArchetype", archetype)}
                      >
                        {archetype}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Reset button */}
        <button
          className="text-[11px] text-blue-600 bg-blue-50 px-3 py-1 rounded-md hover:bg-blue-100"
          onClick={resetFilters}
        >
          Reset Filters
        </button>
      </div>

      <div className="flex gap-4 w-full">
        {/* Left Side - Referring Entities */}
        <div className="flex flex-col bg-white rounded-xl w-[20%] h-[calc(100vh-120px)] border-b border-x border-gray-300">
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={`Search by ${referType}...`}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none"
                value={searchTerms.referring}
                onChange={(e) => handleSearchChange("referring", e.target.value)}
              />
            </div>
          </div>
          <div className="px-3 py-2 border-b border-gray-200">
            <div className="flex justify-between">
              <span className="text-[11px] text-gray-600 font-medium">Referring {referType}</span>
              <span className="text-[11px] text-gray-600 font-medium">Patients Referred Out</span>
            </div>
          </div>
          <div className="overflow-y-auto relative">
            {filterLoading && searchTerms.referring && (
              <div className="absolute inset-0 bg-white bg-opacity-50 z-10 flex items-center justify-center">
                <Loader className="animate-spin h-6 w-6 text-blue-500" />
              </div>
            )}
            {referringEntities.length > 0 ? (
              referringEntities.map((entity, index) => (
                <div
                  key={index}
                  className={`flex justify-between px-3 py-2 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors duration-150 ${
                    selectedEntity.referring === entity.name ? "bg-blue-50 font-medium" : ""
                  }`}
                  onClick={() => handleEntitySelect("referring", entity.name)}
                >
                  <span className="text-[10px] text-gray-800">{entity.name}</span>
                  <span className="text-[10px] text-gray-800">{entity.count}</span>
                </div>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-[11px] text-gray-500">No referring {referType}s found</div>
            )}
          </div>
        </div>

        {/* Center Map */}
        <div className="flex flex-col w-[60%] h-[calc(100vh-120px)] bg-white rounded-xl border-b border-x border-gray-300 relative">
          {filterLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-70 z-50 flex items-center justify-center transition-opacity duration-150 ease-in-out">
              <div className="flex flex-col items-center bg-white p-4 rounded-lg shadow-md">
                <Loader className="animate-spin h-8 w-8 text-blue-500 mb-2" />
                <span className="text-sm text-gray-600 font-medium">Processing data...</span>
              </div>
            </div>
          )}

          {filteredData.length > 0 ? (
            <MapContainer
              bounds={mapBounds}
              style={{ height: "100%", width: "100%" }}
              zoom={4}
              ref={mapRef}
              whenReady={handleMapReady}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapBoundsController bounds={mapBounds} />

              {mapReady && !filterLoading && (
                <MapMarkers
                  referringMarkers={referringMarkers}
                  renderingMarkers={renderingMarkers}
                  mapConnections={mapConnections}
                  selectedEntity={selectedEntity}
                />
              )}
            </MapContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              No data available to display on map
            </div>
          )}
        </div>

        {/* Right Side - Rendering Entities */}
        <div className="flex flex-col bg-white rounded-xl w-[20%] h-[calc(100vh-120px)] border-b border-x border-gray-300">
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={`Search by ${referType}...`}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none"
                value={searchTerms.rendering}
                onChange={(e) => handleSearchChange("rendering", e.target.value)}
              />
            </div>
          </div>
          <div className="px-3 py-2 border-b border-gray-200">
            <div className="flex justify-between">
              <span className="text-[11px] text-gray-600 font-medium">Rendering {referType}</span>
              <span className="text-[11px] text-gray-600 font-medium">Patients Rendered</span>
            </div>
          </div>
          <div className="overflow-y-auto relative">
            {filterLoading && searchTerms.rendering && (
              <div className="absolute inset-0 bg-white bg-opacity-50 z-10 flex items-center justify-center">
                <Loader className="animate-spin h-6 w-6 text-blue-500" />
              </div>
            )}
            {renderingEntities.length > 0 ? (
              renderingEntities.map((entity, index) => (
                <div
                  key={index}
                  className={`flex justify-between px-3 py-2 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors duration-150 ${
                    selectedEntity.rendering === entity.name ? "bg-blue-50 font-medium" : ""
                  }`}
                  onClick={() => handleEntitySelect("rendering", entity.name)}
                >
                  <span className="text-[10px] text-gray-800">{entity.name}</span>
                  <span className="text-[10px] text-gray-800">{entity.count}</span>
                </div>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-[11px] text-gray-500">No rendering {referType}s found</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReferOut