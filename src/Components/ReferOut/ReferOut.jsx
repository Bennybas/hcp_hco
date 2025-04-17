"use client"

import React, { useState, useEffect, useRef, useMemo } from "react"
import { ChevronDown, Search, Loader, ChevronRight, ChevronLeft, Check, ExternalLink } from "lucide-react"
import { MapContainer, TileLayer, Marker, Tooltip, Polyline, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import JSONData from "../../data/refer.json"
import { PropagateLoader } from "react-spinners";
import { useNavigate } from "react-router-dom"


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
const stethoscopeIcon = createMapIcon("/location-mark2.svg", 30)

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
              <div>Patients Referred: {marker.count}</div>
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
              <div>Patients Rendered: {marker.count}</div>
              {marker.isWithinOrg !== undefined && (
                <div className={marker.isWithinOrg ? "text-green-600" : "text-orange-600"}>
                  {marker.isWithinOrg ? "Within Organization" : "Outside Organization"}
                </div>
              )}
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
              color: "#7d7bab",
              weight: 2,
              dashArray: "5, 5",
              opacity: 0.7,
            }}
          >
            <Tooltip direction="center" permanent={false}>
              <div className="text-xs">
                <strong>Patients: {connection.patientCount}</strong>
              </div>
            </Tooltip>
          </Polyline>
        </React.Fragment>
      ))}
    </>
  )
}

const ReferOut = ({ referType = "HCP" }) => {
  const navigate = useNavigate();
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterLoading, setFilterLoading] = useState(false)
  const [error, setError] = useState(null)
  const [filteredData, setFilteredData] = useState([])
  const [mapReady, setMapReady] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const toggleExpanded = () => setExpanded(!expanded)

  const [filters, setFilters] = useState({
    // Common filters
    state: "All",
    states: [], // New array for multi-select
    organizationFilter: "All", // "All", "Within", "Outside"
    years: [], // New array for multi-select years
    territories: [], // New array for multi-select territories

    // HCP filters
    hcpType: "All",
    hcpTypes: [], // New array for multi-select
    hcpSpecialty: "All",
    hcpSpecialties: [], // New array for multi-select

    // HCO filters
    hcoTier: "All",
    hcoTiers: [], // New array for multi-select
    hcoArchetype: "All",
    hcoArchetypes: [], // New array for multi-select
  })

  // State for filter options
  const [filterOptions, setFilterOptions] = useState({
    // Common filter options
    states: ["All"],
    years: ["All"],
    territories: ["All"],

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

        // Extract years, excluding 2016 and 2025
        const years = [
          "All",
          ...new Set(
            cleanedData
              .map((item) => item.year)
              .filter((year) => Boolean(year) && year !== "2016" && year !== "2025")
              .sort((a, b) => b - a), // Sort years in descending order
          ),
        ]

        // Extract territories
        const territories = [
          "All",
          ...new Set([
            ...cleanedData.map((item) => item.rend_hco_territory).filter(Boolean),
            ...cleanedData.map((item) => item.ref_hco_territory).filter(Boolean),
          ]),
        ]

        // Extract filter options based on referType
        if (referType === "HCP") {
          const hcpTypes = ["All", ...new Set(cleanedData.map((item) => item.hcp_segment).filter(Boolean))]
          const hcpSpecialties = ["All", ...new Set(cleanedData.map((item) => item.final_spec).filter(Boolean))]

          setFilterOptions((prev) => ({
            ...prev,
            states,
            years,
            territories,
            hcpTypes,
            hcpSpecialties,
          }))

          // Reset HCP-specific filters
          setFilters((prev) => ({
            ...prev,
            state: "All",
            states: [],
            years: [],
            territories: [],
            organizationFilter: "All",
            hcpType: "All",
            hcpTypes: [],
            hcpSpecialty: "All",
            hcpSpecialties: [],
          }))
        } else {
          // HCO filters
          const hcoTiers = ["All", ...new Set(cleanedData.map((item) => item.hco_mdm_tier).filter(Boolean))]
          const hcoArchetypes = ["All", ...new Set(cleanedData.map((item) => item.hco_grouping).filter(Boolean))]

          setFilterOptions((prev) => ({
            ...prev,
            states,
            years,
            territories,
            hcoTiers,
            hcoArchetypes,
          }))

          // Reset HCO-specific filters
          setFilters((prev) => ({
            ...prev,
            state: "All",
            states: [],
            years: [],
            territories: [],
            organizationFilter: "All",
            hcoTier: "All",
            hcoTiers: [],
            hcoArchetype: "All",
            hcoArchetypes: [],
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
        if (filters.states.length > 0) {
          filtered = filtered.filter(
            (item) => filters.states.includes(item.hco_state) || filters.states.includes(item.ref_hco_state),
          )
        }

        // Apply year filter
        if (filters.years.length > 0) {
          filtered = filtered.filter((item) => filters.years.includes(item.year))
        }

        // Apply territory filter
        if (filters.territories.length > 0) {
          filtered = filtered.filter(
            (item) =>
              filters.territories.includes(item.rend_hco_territory) ||
              filters.territories.includes(item.ref_hco_territory),
          )
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
          if (filters.hcpTypes.length > 0) {
            filtered = filtered.filter((item) => filters.hcpTypes.includes(item.hcp_segment))
          }

          // Apply HCP specialty filter
          if (filters.hcpSpecialties.length > 0) {
            filtered = filtered.filter((item) => filters.hcpSpecialties.includes(item.final_spec))
          }
        } else {
          // Apply HCO-specific filters
          // Apply HCO tier filter
          if (filters.hcoTiers.length > 0) {
            filtered = filtered.filter((item) => filters.hcoTiers.includes(item.hco_mdm_tier))
          }

          // Apply HCO archetype filter
          if (filters.hcoArchetypes.length > 0) {
            filtered = filtered.filter((item) => filters.hcoArchetypes.includes(item.hco_grouping))
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

  // Helper function to get display text for multi-select filters
  const getFilterDisplayText = (filterName) => {
    const values = filters[filterName]
    if (values.length === 0) return "All"
    if (values.length === 1) return values[0]
    return `${values.length} selected`
  }

  // Handle filter changes for multi-select
  const handleFilterChange = (filterName, value) => {
    // Show loading immediately
    setFilterLoading(true)

    // Use requestAnimationFrame to ensure the UI updates before processing
    requestAnimationFrame(() => {
      setFilters((prev) => {
        const newFilters = { ...prev }

        // Handle multi-select filters
        if (
          filterName === "states" ||
          filterName === "years" ||
          filterName === "territories" ||
          filterName === "hcpTypes" ||
          filterName === "hcpSpecialties" ||
          filterName === "hcoTiers" ||
          filterName === "hcoArchetypes"
        ) {
          const currentValues = [...prev[filterName]]

          if (value === "All") {
            // If "All" is selected, clear the array
            return { ...prev, [filterName]: [] }
          } else {
            // Toggle the value
            const valueIndex = currentValues.indexOf(value)
            if (valueIndex === -1) {
              // Add value if not present
              currentValues.push(value)
            } else {
              // Remove value if already present
              currentValues.splice(valueIndex, 1)
            }

            newFilters[filterName] = currentValues
          }
        } else {
          // Handle single-select filters (for backward compatibility)
          newFilters[filterName] = value
        }

        return newFilters
      })
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
  const referringEntities =
  useMemo(() => {
    const entityMap = new Map()

    filteredData.forEach((item) => {
      const entityName = referType === "HCP" ? item.ref_name : item.ref_organization_mdm_name

      // Skip if entity name is null or ref_npi is null
      if (!entityName || !item.ref_npi) return

      if (!entityMap.has(entityName)) {
        entityMap.set(entityName, {
          patients: new Set(),
          hco_mdm: item.hco_mdm,
          ref_hco_npi_mdm: item.ref_hco_npi_mdm, // Store the ref_hco_npi_mdm for referring HCOs
        })
      }

      // Add patient to the set if it exists
      if (item.patient_id) {
        entityMap.get(entityName).patients.add(item.patient_id)
      }
    })

    return Array.from(entityMap.entries())
      .map(([name, data]) => ({
        name,
        count: data.patients.size,
        hco_mdm: data.hco_mdm,
        ref_hco_npi_mdm: data.ref_hco_npi_mdm, 
      }))
      .sort((a, b) => b.count - a.count)
      .filter((entity) => {
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
        entityMap.set(entityName, {
          patients: new Set(),
          isWithinOrg: item.ref_organization_mdm_name === item.hco_mdm_name,
          refOrgName: item.ref_organization_mdm_name,
          rendOrgName: item.hco_mdm_name,
          hco_mdm: item.hco_mdm, // ✅ added hco_mdm here
        })
      }
  
      // Add patient to the set if it exists
      if (item.patient_id) {
        entityMap.get(entityName).patients.add(item.patient_id)
      }
    })
  
    // Convert to array and sort by count
    return Array.from(entityMap.entries())
      .map(([name, data]) => ({
        name,
        count: data.patients.size,
        isWithinOrg: data.isWithinOrg,
        refOrgName: data.refOrgName,
        rendOrgName: data.rendOrgName,
        hco_mdm: data.hco_mdm, // ✅ included in return object
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
          // Check if within organization when a referring entity is selected
          isWithinOrg: selectedEntity.referring ? item.ref_organization_mdm_name === item.hco_mdm_name : undefined,
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
  }, [filteredData, referType, selectedEntity.referring])

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
      // Reset all filters
      setFilters({
        state: "All",
        states: [],
        years: [],
        territories: [],
        organizationFilter: "All",
        hcpType: "All",
        hcpTypes: [],
        hcpSpecialty: "All",
        hcpSpecialties: [],
        hcoTier: "All",
        hcoTiers: [],
        hcoArchetype: "All",
        hcoArchetypes: [],
      })

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
      <div className="flex items-center justify-center h-screen">
          <PropagateLoader color="#0460A9" loading={loading} size={10} />
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
  const getHCPDetails = (hcpName) => {
    navigate("/hcp", { state: { hcp_name: hcpName } })
    
  }
  const getHCODetails = (hcoID) => {
    navigate("/hco", { state: { hco_id: hcoID } })
    console.log('hcoID:',hcoID)
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2 flex-wrap">
          {/* Common Filters - State Filter with checkbox */}
          <div className="relative">
            <div
              className={`flex py-2 px-2 bg-white rounded-xl gap-2 items-center border-b border-x ${
                filters.states.length > 0 ? "border-[#0460A9] bg-blue-50" : "border-gray-300"
              } cursor-pointer transition-colors duration-150`}
              onClick={() => toggleDropdown("state")}
            >
              <span
                className={`text-[11px] ${filters.states.length > 0 ? "text-[#0460A9] font-medium" : "text-gray-600"}`}
              >
                State: {getFilterDisplayText("states")}
              </span>
              <ChevronDown className={`w-4 h-4 ${filters.states.length > 0 ? "text-[#0460A9]" : "text-gray-500"}`} />
            </div>
            {openDropdown === "state" && (
              <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-md z-[60] w-48 max-h-40 overflow-y-auto">
                {filterOptions.states.map((state, i) => (
                  <div
                    key={i}
                    className="flex items-center p-2 text-[12px] hover:bg-gray-100 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleFilterChange("states", state)
                    }}
                  >
                    <div
                      className={`w-4 h-4 mr-2 border rounded flex items-center justify-center ${
                        state === "All"
                          ? filters.states.length === 0
                            ? "bg-blue-500 border-blue-500"
                            : "border-gray-300"
                          : filters.states.includes(state)
                            ? "bg-blue-500 border-blue-500"
                            : "border-gray-300"
                      }`}
                    >
                      {(state === "All" && filters.states.length === 0) ||
                      (state !== "All" && filters.states.includes(state)) ? (
                        <Check className="w-3 h-3 text-white" />
                      ) : null}
                    </div>
                    {state}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Territory Filter - New filter with checkbox */}
          <div className="relative">
            <div
              className={`flex py-2 px-2 bg-white rounded-xl gap-2 items-center border-b border-x ${
                filters.territories.length > 0 ? "border-[#0460A9] bg-blue-50" : "border-gray-300"
              } cursor-pointer transition-colors duration-150`}
              onClick={() => toggleDropdown("territory")}
            >
              <span
                className={`text-[11px] ${filters.territories.length > 0 ? "text-[#0460A9] font-medium" : "text-gray-600"}`}
              >
                Territory: {getFilterDisplayText("territories")}
              </span>
              <ChevronDown
                className={`w-4 h-4 ${filters.territories.length > 0 ? "text-[#0460A9]" : "text-gray-500"}`}
              />
            </div>
            {openDropdown === "territory" && (
              <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-md  z-[1000] w-48 max-h-40 overflow-y-auto">
                {filterOptions.territories.map((territory, i) => (
                  <div
                    key={i}
                    className="flex items-center p-2 text-[12px] hover:bg-gray-100 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleFilterChange("territories", territory)
                    }}
                  >
                    <div
                      className={`w-4 h-4 mr-2 border rounded flex items-center justify-center ${
                        territory === "All"
                          ? filters.territories.length === 0
                            ? "bg-blue-500 border-blue-500"
                            : "border-gray-300"
                          : filters.territories.includes(territory)
                            ? "bg-blue-500 border-blue-500"
                            : "border-gray-300"
                      }`}
                    >
                      {(territory === "All" && filters.territories.length === 0) ||
                      (territory !== "All" && filters.territories.includes(territory)) ? (
                        <Check className="w-3 h-3 text-white" />
                      ) : null}
                    </div>
                    {territory}
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
            // HCP Filters with checkboxes
            <>
              {/* HCP Type Filter */}
              <div className="relative">
                <div
                  className={`flex py-2 px-2 bg-white rounded-xl gap-2 items-center border-b border-x ${
                    filters.hcpTypes.length > 0 ? "border-[#0460A9] bg-blue-50" : "border-gray-300"
                  } cursor-pointer transition-colors duration-150`}
                  onClick={() => toggleDropdown("hcpType")}
                >
                  <span
                    className={`text-[11px] ${filters.hcpTypes.length > 0 ? "text-[#0460A9] font-medium" : "text-gray-600"}`}
                  >
                    HCP Type: {getFilterDisplayText("hcpTypes")}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 ${filters.hcpTypes.length > 0 ? "text-[#0460A9]" : "text-gray-500"}`}
                  />
                </div>
                {openDropdown === "hcpType" && (
                  <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-md z-[1000] w-48 max-h-40 overflow-y-auto">
                    {filterOptions.hcpTypes.map((type, i) => (
                      <div
                        key={i}
                        className="flex items-center p-2 text-[12px] hover:bg-gray-100 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleFilterChange("hcpTypes", type)
                        }}
                      >
                        <div
                          className={`w-4 h-4 mr-2 border rounded flex items-center justify-center ${
                            type === "All"
                              ? filters.hcpTypes.length === 0
                                ? "bg-blue-500 border-blue-500"
                                : "border-gray-300"
                              : filters.hcpTypes.includes(type)
                                ? "bg-blue-500 border-blue-500"
                                : "border-gray-300"
                          }`}
                        >
                          {(type === "All" && filters.hcpTypes.length === 0) ||
                          (type !== "All" && filters.hcpTypes.includes(type)) ? (
                            <Check className="w-3 h-3 text-white" />
                          ) : null}
                        </div>
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
                    filters.hcpSpecialties.length > 0 ? "border-[#0460A9] bg-blue-50" : "border-gray-300"
                  } cursor-pointer transition-colors duration-150`}
                  onClick={() => toggleDropdown("hcpSpecialty")}
                >
                  <span
                    className={`text-[11px] ${filters.hcpSpecialties.length > 0 ? "text-[#0460A9] font-medium" : "text-gray-600"}`}
                  >
                    HCP Specialty: {getFilterDisplayText("hcpSpecialties")}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 ${filters.hcpSpecialties.length > 0 ? "text-[#0460A9]" : "text-gray-500"}`}
                  />
                </div>
                {openDropdown === "hcpSpecialty" && (
                  <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-md z-[1000] w-48 max-h-40 overflow-y-auto">
                    {filterOptions.hcpSpecialties.map((specialty, i) => (
                      <div
                        key={i}
                        className="flex items-center p-2 text-[12px] hover:bg-gray-100 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleFilterChange("hcpSpecialties", specialty)
                        }}
                      >
                        <div
                          className={`w-4 h-4 mr-2 border rounded flex items-center justify-center ${
                            specialty === "All"
                              ? filters.hcpSpecialties.length === 0
                                ? "bg-blue-500 border-blue-500"
                                : "border-gray-300"
                              : filters.hcpSpecialties.includes(specialty)
                                ? "bg-blue-500 border-blue-500"
                                : "border-gray-300"
                          }`}
                        >
                          {(specialty === "All" && filters.hcpSpecialties.length === 0) ||
                          (specialty !== "All" && filters.hcpSpecialties.includes(specialty)) ? (
                            <Check className="w-3 h-3 text-white" />
                          ) : null}
                        </div>
                        {specialty}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            // HCO Filters with checkboxes
            <>
              {/* HCO Tier Filter */}
              <div className="relative">
                <div
                  className={`flex py-2 px-2 bg-white rounded-xl gap-2 items-center border-b border-x ${
                    filters.hcoTiers.length > 0 ? "border-blue-400 bg-blue-50" : "border-gray-300"
                  } cursor-pointer transition-colors duration-150`}
                  onClick={() => toggleDropdown("hcoTier")}
                >
                  <span
                    className={`text-[11px] ${filters.hcoTiers.length > 0 ? "text-blue-600 font-medium" : "text-gray-600"}`}
                  >
                    HCO Tier: {getFilterDisplayText("hcoTiers")}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 ${filters.hcoTiers.length > 0 ? "text-blue-500" : "text-gray-500"}`}
                  />
                </div>
                {openDropdown === "hcoTier" && (
                  <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-md z-[60] w-48 max-h-40 overflow-y-auto">
                    {filterOptions.hcoTiers.map((tier, i) => (
                      <div
                        key={i}
                        className="flex items-center p-2 text-[12px] hover:bg-gray-100 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleFilterChange("hcoTiers", tier)
                        }}
                      >
                        <div
                          className={`w-4 h-4 mr-2 border rounded flex items-center justify-center ${
                            tier === "All"
                              ? filters.hcoTiers.length === 0
                                ? "bg-blue-500 border-blue-500"
                                : "border-gray-300"
                              : filters.hcoTiers.includes(tier)
                                ? "bg-blue-500 border-blue-500"
                                : "border-gray-300"
                          }`}
                        >
                          {(tier === "All" && filters.hcoTiers.length === 0) ||
                          (tier !== "All" && filters.hcoTiers.includes(tier)) ? (
                            <Check className="w-3 h-3 text-white" />
                          ) : null}
                        </div>
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
                    filters.hcoArchetypes.length > 0 ? "border-blue-400 bg-blue-50" : "border-gray-300"
                  } cursor-pointer transition-colors duration-150`}
                  onClick={() => toggleDropdown("hcoArchetype")}
                >
                  <span
                    className={`text-[11px] ${filters.hcoArchetypes.length > 0 ? "text-blue-600 font-medium" : "text-gray-600"}`}
                  >
                    Account Archetype: {getFilterDisplayText("hcoArchetypes")}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 ${filters.hcoArchetypes.length > 0 ? "text-blue-500" : "text-gray-500"}`}
                  />
                </div>
                {openDropdown === "hcoArchetype" && (
                  <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-md z-[60] w-48 max-h-40 overflow-y-auto">
                    {filterOptions.hcoArchetypes.map((archetype, i) => (
                      <div
                        key={i}
                        className="flex items-center p-2 text-[12px] hover:bg-gray-100 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleFilterChange("hcoArchetypes", archetype)
                        }}
                      >
                        <div
                          className={`w-4 h-4 mr-2 border rounded flex items-center justify-center ${
                            archetype === "All"
                              ? filters.hcoArchetypes.length === 0
                                ? "bg-blue-500 border-blue-500"
                                : "border-gray-300"
                              : filters.hcoArchetypes.includes(archetype)
                                ? "bg-blue-500 border-blue-500"
                                : "border-gray-300"
                          }`}
                        >
                          {(archetype === "All" && filters.hcoArchetypes.length === 0) ||
                          (archetype !== "All" && filters.hcoArchetypes.includes(archetype)) ? (
                            <Check className="w-3 h-3 text-white" />
                          ) : null}
                        </div>
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

      {/* Year Filter - Expandable like in other components */}
      <div className="w-full justify-between items-center">

      
        <div
          className={`flex flex-wrap bg-white border-b border-x border-gray-300 rounded-xl p-2 items-center gap-2 cursor-pointer transition-all duration-300 ${
            expanded ? "max-w-fit" : "w-20 justify-between"
          }`}
          onClick={toggleExpanded}
        >
          <span className="text-gray-600 text-[12px]">Year</span>

          {expanded ? (
            <>
              <div className="flex flex-wrap gap-2 ml-2 mr-2">
                {filterOptions.years.map((year) => (
                  <button
                    key={year}
                    className={`flex items-center text-[10px] py-1 px-4 rounded-full border transition ${
                      year === "All"
                        ? filters.years.length === 0
                          ? "bg-[#217fad] text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-blue-100"
                        : filters.years.includes(year)
                          ? "bg-[#217fad] text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-blue-100"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation() // Prevent parent div click
                      handleFilterChange("years", year)
                    }}
                  >
                    {year}
                  </button>
                ))}
              </div>
              <ChevronLeft className="text-gray-600 w-4 h-4 ml-auto" />
            </>
          ) : (
            <ChevronRight className="text-gray-600 w-4 h-4" />
          )}
          
        </div>
      <div className="flex justify-end -mt-4 items-center">
        <img src="/location-marker.svg" alt="hcp-hco" className="h-4 w-4" />
       <span className="text-[12px] text-gray-600">Renderer</span>
        <img src="/location-mark2.svg" alt="hcp-hco" className="h-4 w-4" />
        <span className="text-[12px] text-gray-600">Referer</span>
      </div>
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
                  <span
                  className="text-[10px] text-gray-800 flex flex-col gap-1">{entity.name} 
                  <span>
                  {
                    referType === "HCP" ? (
                      <ExternalLink
                        onClick={(e) => {
                          e.stopPropagation() // Stop event from bubbling up to parent
                          getHCPDetails(entity.name)
                        }}
                        className="w-2 h-2 text-blue-500 hover:text-blue-700"
                      />
                    ) : (
                      <ExternalLink
                        onClick={(e) => {
                          e.stopPropagation() // Stop event from bubbling up to parent
                          getHCODetails(entity.ref_hco_npi_mdm) // Use ref_hco_npi_mdm for referring HCOs
                        }}
                        className="w-2 h-2 text-blue-500 hover:text-blue-700"
                      />
                    )
                  }
                  </span>
                  </span>
                  
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
                  <div className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-800 flex flex-col gap-1">
                    {
                      entity.name
                    }
                    <span>
                      {
                        referType === "HCP" ? (
                          <ExternalLink
                            onClick={(e) => {
                              e.stopPropagation() // Stop event from bubbling up to parent
                              getHCPDetails(entity.name)
                            }}
                            className="w-2 h-2 text-blue-500 hover:text-blue-700"
                          />
                        ) : (
                          <ExternalLink
                            onClick={(e) => {
                              e.stopPropagation() // Stop event from bubbling up to parent
                              getHCODetails(entity.hco_mdm) // Use hco_mdm for rendering HCOs
                            }}
                            className="w-2 h-2 text-blue-500 hover:text-blue-700"
                          />
                        )
                      }

                    </span>
                    {
                      selectedEntity.referring && (
                        <span
                          className={`text-[8px] px-1 py-0.5 w-8 rounded ${entity.isWithinOrg ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}
                        >
                          {entity.isWithinOrg ? "Within" : "Outside"}
                        </span>
                      )
                    }
                    </span>
                    
                    </div>

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
