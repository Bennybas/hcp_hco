"use client"

import { useState, useEffect, useCallback } from "react"
import { FaUserDoctor } from "react-icons/fa6"
import PrescriberClusterChart from "./PrescriberChart"
import HCOchart from "./HCOchart"
import { useNavigate } from "react-router-dom"
import USAMap from "./Map"
import api from "../api/api"
import { ChevronDown, X } from "lucide-react"
import { PropagateLoader } from "react-spinners"

const Overview = () => {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedState, setSelectedState] = useState(null)
  const [metrics, setMetrics] = useState({
    totalHCPs: 0,
    totalPatients: 0,
    avgTreatingHCPs: 0,
    avgPatientsPerHCP: 0,
    hcpsReferringPatients: 0,
    avgPatientsReferredPerHCP: 0,
    totalHCOs: 0,
    zolgemsmaEver: 0,
    avgTreatingHCOs: 0,
    avgPatientsPerHCO: 0,
    hcosReferringPatients: 0,
    avgPatientsReferredPerHCO: 0,
    topHCPs: [],
    topHCOs: [],
  })
  const [dataTimestamp, setDataTimestamp] = useState(null)

  // Year filter state
  const [yearOptions, setYearOptions] = useState([])
  const [selectedYears, setSelectedYears] = useState([])
  const [showYearDropdown, setShowYearDropdown] = useState(false)

  // Territory filter state
  const [territoryOptions, setTerritoryOptions] = useState([])
  const [selectedTerritories, setSelectedTerritories] = useState([])
  const [showTerritoryDropdown, setShowTerritoryDropdown] = useState(false)

  // HCP segment and HCO grouping filters
  const [selectedHcpSegment, setSelectedHcpSegment] = useState(null)
  const [selectedHcoGrouping, setSelectedHcoGrouping] = useState(null)

  // Fetch data only once when component mounts
  useEffect(() => {
    fetchData()
  }, [])

  // Update filtered data when filters change
  useEffect(() => {
    if (data.length > 0) {
      let filtered = [...data]

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
      if (selectedYears.length > 0) {
        filtered = filtered.filter((item) => selectedYears.includes(item.year))
      }

      // Apply territory filter
      if (selectedTerritories.length > 0) {
        filtered = filtered.filter(
          (item) =>
            (item.rend_hco_territory && selectedTerritories.includes(item.rend_hco_territory)) ||
            (item.ref_hco_territory && selectedTerritories.includes(item.ref_hco_territory)),
        )
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

      setFilteredData(filtered)
      calculateMetrics(filtered, selectedState)
    }
  }, [selectedState, selectedYears, selectedTerritories, selectedHcpSegment, selectedHcoGrouping, data])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Instead of storing the entire dataset, we'll use a memory-only approach
      // and only store a timestamp in sessionStorage to track data freshness
      const lastFetchTime = sessionStorage.getItem("overviewDataTimestamp")
      const currentTime = new Date().getTime()

      // If we have a timestamp and it's less than 30 minutes old, skip the fetch
      // This prevents excessive API calls while avoiding storage quota issues
      if (lastFetchTime && currentTime - Number.parseInt(lastFetchTime) < 30 * 60 * 1000) {
        console.log(
          "Using in-memory data, last fetched at:",
          new Date(Number.parseInt(lastFetchTime)).toLocaleTimeString(),
        )
        if (data.length > 0) {
          setLoading(false)
          return
        }
      }

      console.log("Fetching fresh data from API")
      const response = await fetch(`${api}/fetch-data`)

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`)
      }

      const jsonData = await response.json()

      // Validate the data
      if (!Array.isArray(jsonData) || jsonData.length === 0) {
        console.error("API returned invalid or empty data:", jsonData)
        throw new Error("API returned invalid or empty data")
      }

      console.log("Fetched data successfully:", jsonData.length, "records")

      // Store only the timestamp in sessionStorage, not the actual data
      const fetchTimestamp = new Date().getTime()
      sessionStorage.setItem("overviewDataTimestamp", fetchTimestamp.toString())
      setDataTimestamp(fetchTimestamp)

      // Extract unique years, excluding 2016 and 2025
      const years = [...new Set(jsonData.map((item) => item.year))]
        .filter((year) => year && year !== "-" && year !== "2016" && year !== "2025")
        .sort((a, b) => b - a) // Sort years in descending order

      setYearOptions(years)

      // Extract unique territories from both rend_hco_territory and ref_hco_territory
      const territories = [
        "MIDWEST",
        "SOUTHEAST",
        "ROCKY MOUNTAIN",
        "CAPITOL",
        "SOUTHWEST",
        "TEXAS",
        "UPPER MIDWEST",
        "SOUTH CENTRAL",
        "NEW ENGLAND",
        "OHIO VALLEY",
      ].sort() // Sort alphabetically

      setTerritoryOptions(territories)

      // Keep the data in memory only
      setData(jsonData)
      setFilteredData(jsonData)
      calculateMetrics(jsonData, null)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching data:", error)
      setLoading(false)
    }
  }

  // Memoize the calculateMetrics function to prevent unnecessary recalculations
  const calculateMetrics = useCallback(
    (data, selectedState) => {
      if (!Array.isArray(data) || data.length === 0) {
        console.warn("Cannot calculate metrics: data is empty or invalid")
        return
      }

      // Create a Set of selected territories for faster lookups
      const selectedTerritoriesSet = new Set(selectedTerritories)
      const hasSelectedTerritories = selectedTerritories && selectedTerritories.length > 0

      // For rendering HCPs, filter by hcp_state if a state is selected
      // AND by rend_hco_territory if territories are selected
      const renderingHcps = data.filter(
        (item) =>
          (!selectedState || item.hcp_state === selectedState) &&
          (!hasSelectedTerritories || (item.rend_hco_territory && selectedTerritoriesSet.has(item.rend_hco_territory))),
      )
      const uniqueRendHCP = new Set(renderingHcps.map((item) => item.hcp_id).filter((id) => id && id !== "-"))

      // For referring HCPs, filter by ref_hcp_state if a state is selected
      // AND by ref_hco_territory if territories are selected
      const referringHcps = data.filter(
        (item) =>
          (!selectedState || item.ref_hcp_state === selectedState) &&
          (!hasSelectedTerritories || (item.ref_hco_territory && selectedTerritoriesSet.has(item.ref_hco_territory))),
      )
      const uniqueRefHCP = new Set(referringHcps.map((item) => item.ref_npi).filter((npi) => npi && npi !== "-"))

      const uniqueHCPs = new Set([...uniqueRendHCP, ...uniqueRefHCP])

      const relevantPatients = data.filter(
        (item) =>
          (!selectedState || item.hcp_state === selectedState || item.ref_hcp_state === selectedState) &&
          (!hasSelectedTerritories ||
            (item.rend_hco_territory && selectedTerritoriesSet.has(item.rend_hco_territory)) ||
            (item.ref_hco_territory && selectedTerritoriesSet.has(item.ref_hco_territory))),
      )
      const uniquePatients = new Set(relevantPatients.map((item) => item.patient_id).filter((id) => id && id !== "-"))

      // For rendering HCOs, filter by hco_state if a state is selected
      // AND by rend_hco_territory if territories are selected
      const renderingHcos = data.filter(
        (item) =>
          (!selectedState || item.hco_state === selectedState) &&
          (!hasSelectedTerritories || (item.rend_hco_territory && selectedTerritoriesSet.has(item.rend_hco_territory))),
      )
      const uniqueRendHCO = new Set(renderingHcos.map((item) => item.hco_mdm).filter((id) => id && id !== "-"))

      // For referring HCOs, filter by ref_hco_state if a state is selected
      // AND by ref_hco_territory if territories are selected
      const referringHcos = data.filter(
        (item) =>
          (!selectedState || item.ref_hco_state === selectedState) &&
          (!hasSelectedTerritories || (item.ref_hco_territory && selectedTerritoriesSet.has(item.ref_hco_territory))),
      )
      const uniqueRefHCO = new Set(
        referringHcos.map((item) => item.ref_hco_npi_mdm).filter((npi) => npi && npi !== "-"),
      )

      // Combine both sets for total unique HCOs
      const uniqueHCOs = new Set([...uniqueRendHCO, ...uniqueRefHCO])

      const zolgensmaHcos = data.filter(
        (item) =>
          item.zolg_prescriber === "Yes" &&
          (!selectedState || item.hco_state === selectedState) &&
          (!hasSelectedTerritories || (item.rend_hco_territory && selectedTerritoriesSet.has(item.rend_hco_territory))),
      )
      const zolgemsmaHCOs = new Set(zolgensmaHcos.map((item) => item.hco_mdm))
      const zolgemsmaHCOCount = zolgemsmaHCOs.size

      // Calculate patient counts per HCP
      const hcpPatientMap = new Map()
      const hcpIdToNameMap = new Map()
      const hcpIdToSpecialityMap = new Map()
      const hcpZOLMap = new Map()

      renderingHcps.forEach((item) => {
        if (item.hcp_id && item.hcp_id !== "-") {
          if (!hcpPatientMap.has(item.hcp_id)) {
            hcpPatientMap.set(item.hcp_id, new Set())
            hcpIdToNameMap.set(item.hcp_id, item.hcp_name)

            // Set specialty if available
            if (item.final_spec && item.final_spec !== "-") {
              hcpIdToSpecialityMap.set(item.hcp_id, item.final_spec)
            }
            if (item.zolgensma_iv_target && item.zolgensma_iv_target !== "-") {
              hcpZOLMap.set(item.hcp_id, item.zolgensma_iv_target.toUpperCase())
            }
          } else {
            // Fallback: Add specialty if missing
            if (!hcpIdToSpecialityMap.has(item.hcp_id) && item.final_spec && item.final_spec !== "-") {
              hcpIdToSpecialityMap.set(item.hcp_id, item.final_spec)
            }

            // Optional: If KOL isn't already set and exists on this item
            if (!hcpZOLMap.has(item.hcp_id) && item.zolgensma_iv_target && item.zolgensma_iv_target !== "-") {
              hcpZOLMap.set(item.hcp_id, item.zolgensma_iv_target.toUpperCase())
            }
          }

          // Add patient ID
          if (item.patient_id && item.patient_id !== "-") {
            hcpPatientMap.get(item.hcp_id).add(item.patient_id)
          }
        }
      })

      // Calculate patient counts per HCO
      const hcoPatientMap = new Map()
      const hcoIdToNameMap = new Map()
      const hcoIdToGroupingMap = new Map()

      // Process rendering HCOs with state filter
      renderingHcos.forEach((item) => {
        if (item.hco_mdm && item.hco_mdm !== "-") {
          if (!hcoPatientMap.has(item.hco_mdm)) {
            hcoPatientMap.set(item.hco_mdm, new Set())
            hcoIdToNameMap.set(item.hco_mdm, item.hco_mdm_name)
            // Initialize with the grouping from the first occurrence
            if (item.hco_grouping && item.hco_grouping !== "-") {
              hcoIdToGroupingMap.set(item.hco_mdm, item.hco_grouping)
            }
          } else if (!hcoIdToGroupingMap.has(item.hco_mdm) && item.hco_grouping && item.hco_grouping !== "-") {
            // If we already have this HCO but no grouping yet, add it
            hcoIdToGroupingMap.set(item.hco_mdm, item.hco_grouping)
          }

          if (item.patient_id && item.patient_id !== "-") {
            hcoPatientMap.get(item.hco_mdm).add(item.patient_id)
          }
        }
      })

      // Get referring HCPs and HCOs with state filters
      const referringHCPsSet = new Set()
      const referringHCOsSet = new Set()

      referringHcps.forEach((item) => {
        if (item.ref_npi && item.ref_npi !== "-") {
          referringHCPsSet.add(item.ref_npi)
        }
      })

      referringHcos.forEach((item) => {
        if (item.ref_hco_npi_mdm && item.ref_hco_npi_mdm !== "-") {
          referringHCOsSet.add(item.ref_hco_npi_mdm)
        }
      })

      // Calculate average patients per HCP
      const patientCountsPerHCP = Array.from(hcpPatientMap.values()).map((patientSet) => patientSet.size)

      const avgPatientsPerHCP =
        patientCountsPerHCP.length > 0
          ? patientCountsPerHCP.reduce((sum, count) => sum + count, 0) / patientCountsPerHCP.length
          : 0

      const patientCountsPerHCO = Array.from(hcoPatientMap.values()).map((patientSet) => patientSet.size)

      const avgPatientsPerHCO =
        patientCountsPerHCO.length > 0
          ? patientCountsPerHCO.reduce((sum, count) => sum + count, 0) / patientCountsPerHCO.length
          : 0

      const hcpVolume = Array.from(hcpPatientMap.entries()).map(([hcpId, patients]) => {
        return {
          id: hcpId,
          name: hcpIdToNameMap.get(hcpId) || `HCP ${hcpId}`,
          volume: patients.size,
          speciality: hcpIdToSpecialityMap.get(hcpId) || "Unknown",
          kol: hcpZOLMap.get(hcpId),
        }
      })

      const topHCPs = hcpVolume.sort((a, b) => b.volume - a.volume).slice(0, 10)

      // Calculate Top HCOs by patient volume - with HCO IDs and grouping
      const hcoVolume = Array.from(hcoPatientMap.entries()).map(([hcoId, patients]) => {
        const hcoName = hcoIdToNameMap.get(hcoId) || "Unknown"
        return {
          id: hcoId,
          name: hcoName !== "-" ? hcoName : "Unknown",
          volume: patients.size,
          grouping: hcoIdToGroupingMap.get(hcoId) || "Unspecified",
        }
      })

      // Filter out "Unknown" HCOs and then take top 10
      const topHCOs = hcoVolume
        .filter((hco) => hco.name !== "Unknown")
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 10)

      // Set metrics
      setMetrics({
        totalHCPs: uniqueHCPs.size,
        totalPatients: uniquePatients.size,
        avgTreatingHCPs: uniqueRendHCP.size,
        avgPatientsPerHCP: Math.round(avgPatientsPerHCP * 10) / 10,
        hcpsReferringPatients: uniqueRefHCP.size,
        avgPatientsReferredPerHCP:
          Math.round((uniqueRefHCP.size > 0 ? uniquePatients.size / uniqueRefHCP.size : 0) * 10) / 10,
        totalHCOs: uniqueHCOs.size,
        zolgemsmaEver: zolgemsmaHCOCount,
        avgTreatingHCOs: uniqueRendHCO.size,
        avgPatientsPerHCO: Math.round(avgPatientsPerHCO * 10) / 10,
        hcosReferringPatients: referringHCOsSet.size,
        avgPatientsReferredPerHCO:
          Math.round((referringHCOsSet.size > 0 ? uniquePatients.size / referringHCOsSet.size : 0) * 10) / 10,
        topHCPs,
        topHCOs,
      })
    },
    [selectedTerritories],
  )

  // Handle state selection from the map
  const handleStateSelect = (stateAbbr) => {
    setSelectedState(stateAbbr)
  }

  // Handle year selection
  const handleYearToggle = (year) => {
    setSelectedYears((prev) => {
      if (prev.includes(year)) {
        return prev.filter((y) => y !== year)
      } else {
        return [...prev, year]
      }
    })
  }

  // Handle territory selection
  const handleTerritoryToggle = (territory) => {
    setSelectedTerritories((prev) => {
      if (prev.includes(territory)) {
        return prev.filter((t) => t !== territory)
      } else {
        return [...prev, territory]
      }
    })
  }

  // Handle HCP segment selection from chart
  const handleHcpSegmentSelect = (segment) => {
    if (selectedHcpSegment === segment) {
      setSelectedHcpSegment(null) // Clear filter if same segment clicked
    } else {
      setSelectedHcpSegment(segment)
    }
  }

  // Handle HCO grouping selection from chart
  const handleHcoGroupingSelect = (grouping) => {
    if (selectedHcoGrouping === grouping) {
      setSelectedHcoGrouping(null) // Clear filter if same grouping clicked
    } else {
      setSelectedHcoGrouping(grouping)
    }
  }

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedState(null)
    setSelectedYears([])
    setSelectedTerritories([])
    setSelectedHcpSegment(null)
    setSelectedHcoGrouping(null)
  }

  const getHCPDetails = (hcpName) => {
    navigate("/hcp", { state: { hcp_name: hcpName } })
  }

  const getHCODetails = (hcoId) => {
    navigate("/hco", { state: { hco_id: hcoId } })
  }

  // Function to force refresh data
  const refreshData = () => {
    // Clear the timestamp to force a fresh fetch
    sessionStorage.removeItem("overviewDataTimestamp")
    fetchData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <PropagateLoader color="#0460A9" size={10} />
      </div>
    )
  }

  return (
    <>
      <div className="flex w-full justify-between p-2">
        <div className="flex items-center gap-2">
          {/* Year Filter Dropdown */}
          <div className="relative">
            <div
              className={`flex items-center py-1 px-2 rounded-lg bg-white justify-between cursor-pointer min-w-[120px] ${
                selectedYears.length > 0 ? "border-x-[#0460A9] border-b-[#0460A9]  border" : ""
              }`}
              onClick={() => setShowYearDropdown(!showYearDropdown)}
            >
              <span className="text-[12px] text-gray-600">
                Year:{" "}
                {selectedYears.length === 0
                  ? "All"
                  : selectedYears.length === 1
                    ? selectedYears[0]
                    : `${selectedYears.length} selected`}
              </span>
              <ChevronDown className="w-4 h-4" />
            </div>

            {showYearDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-md z-10 w-48 max-h-60 overflow-y-auto">
                {yearOptions.map((year) => (
                  <div
                    key={year}
                    className="flex items-center p-2 hover:bg-gray-100 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleYearToggle(year)
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedYears.includes(year)}
                      onChange={() => {}}
                      className="mr-2"
                    />
                    <span className="text-[12px]">{year}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Territory Filter Dropdown */}
          <div className="relative">
            <div
              className={`flex items-center py-1 px-2 rounded-lg bg-white justify-between cursor-pointer min-w-[120px] ${
                selectedTerritories.length > 0 ? "border-x-[#0460A9] border-b-[#0460A9]  border" : ""
              }`}
              onClick={() => setShowTerritoryDropdown(!showTerritoryDropdown)}
            >
              <span className="text-[12px] text-gray-600">
                Territory:{" "}
                {selectedTerritories.length === 0
                  ? "All"
                  : selectedTerritories.length === 1
                    ? selectedTerritories[0]
                    : `${selectedTerritories.length} selected`}
              </span>
              <ChevronDown className="w-4 h-4" />
            </div>

            {showTerritoryDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-md z-10 w-48 max-h-60 overflow-y-auto">
                {territoryOptions.map((territory) => (
                  <div
                    key={territory}
                    className="flex items-center p-2 hover:bg-gray-100 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleTerritoryToggle(territory)
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTerritories.includes(territory)}
                      onChange={() => {}}
                      className="mr-2"
                    />
                    <span className="text-[12px]">{territory}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Filters Display */}
          <div className="flex flex-wrap gap-2">
            {selectedState && (
              <div className="flex items-center bg-blue-100 text-blue-800 rounded-lg px-2 py-1 text-[11px]">
                State: {ABBR_TO_STATE[selectedState]}
                <button onClick={() => setSelectedState(null)} className="ml-1 text-blue-600 hover:text-blue-800">
                  <X size={12} />
                </button>
              </div>
            )}

            {selectedHcpSegment && (
              <div className="flex items-center bg-blue-100 text-blue-800 rounded-lg px-2 py-1 text-[11px]">
                HCP Segment: {selectedHcpSegment}
                <button onClick={() => setSelectedHcpSegment(null)} className="ml-1 text-blue-600 hover:text-blue-800">
                  <X size={12} />
                </button>
              </div>
            )}

            {selectedHcoGrouping && (
              <div className="flex items-center bg-blue-100 text-blue-800 rounded-lg px-2 py-1 text-[11px]">
                HCO Grouping: {selectedHcoGrouping}
                <button onClick={() => setSelectedHcoGrouping(null)} className="ml-1 text-blue-600 hover:text-blue-800">
                  <X size={12} />
                </button>
              </div>
            )}

            {(selectedState ||
              selectedYears.length > 0 ||
              selectedTerritories.length > 0 ||
              selectedHcpSegment ||
              selectedHcoGrouping) && (
              <button
                onClick={clearAllFilters}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg px-2 py-1 text-[11px] flex items-center"
              >
                Clear All Filters
                <X size={12} className="ml-1" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-4 w-full p-2">
        <div className="flex flex-col w-[29%] gap-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between">
              <div className="flex gap-2 items-center">
                <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                  <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
                </div>
                <span className="text-gray-500 text-[11px] font-[500]">Total HCPs</span>
              </div>
              <span className="text-gray-700 text-[16px] font-[500] pl-2">{metrics.totalHCPs.toLocaleString()}</span>
            </div>
            <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between">
              <div className="flex gap-2 items-center">
                <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                  <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
                </div>
                <span className="text-gray-500 text-[11px] font-[500]">Total Treated Patients</span>
              </div>
              <span className="text-gray-700 text-[16px] font-[500] pl-2">
                {metrics.totalPatients.toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between">
              <div className="flex gap-2 items-center">
                <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                  <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
                </div>
                <span className="text-gray-500 text-[11px] font-[500]">Treating HCPs</span>
              </div>
              <span className="text-gray-700 text-[16px] font-[500] pl-2">
                {metrics.avgTreatingHCPs.toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between">
              <div className="flex gap-2 items-center">
                <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                  <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
                </div>
                <span className="text-gray-500 text-[11px] font-[500]">Avg.Treated Patients per HCPs</span>
              </div>
              <span className="text-gray-700 text-[16px] font-[500] pl-2">
                {metrics.avgPatientsPerHCP.toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between">
              <div className="flex gap-2 items-center">
                <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                  <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
                </div>
                <span className="text-gray-500 text-[11px] font-[500]">Referring HCPs</span>
              </div>
              <span className="text-gray-700 text-[16px] font-[500] pl-2">
                {metrics.hcpsReferringPatients.toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between">
              <div className="flex gap-2 items-center">
                <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                  <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
                </div>
                <span className="text-gray-500 text-[11px] font-[500]">Avg.Patients Referred per HCP</span>
              </div>
              <span className="text-gray-700 text-[16px] font-[500] pl-2">
                {metrics.avgPatientsReferredPerHCP.toLocaleString()}
              </span>
            </div>
          </div>

          <PrescriberClusterChart
            hcpData={filteredData}
            onSegmentClick={handleHcpSegmentSelect}
            selectedSegment={selectedHcpSegment}
          />
        </div>

        <div className="flex flex-col w-[42%] ">
          <USAMap
            onStateSelect={handleStateSelect}
            selectedState={selectedState}
            selectedTerritories={selectedTerritories}
            selectedYears={selectedYears}
            selectedHcpSegment={selectedHcpSegment}
            selectedHcoGrouping={selectedHcoGrouping}
          />
        </div>

        <div className="flex flex-col w-[29%] gap-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between">
              <div className="flex gap-2 items-center">
                <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                  <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
                </div>
                <span className="text-gray-500 text-[11px] font-[500]">Total HCOs</span>
              </div>
              <span className="text-gray-700 text-[16px] font-[500] pl-2">{metrics.totalHCOs.toLocaleString()}</span>
            </div>
            <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between">
              <div className="flex gap-2 items-center">
                <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                  <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
                </div>
                <span className="text-gray-500 text-[11px] font-[500]">Zolgensma Prescribing HCOs</span>
              </div>
              <span className="text-gray-700 text-[16px] font-[500] pl-2">
                {metrics.zolgemsmaEver.toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between">
              <div className="flex gap-2 items-center">
                <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                  <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
                </div>
                <span className="text-gray-500 text-[11px] font-[500]">Treating HCOs</span>
              </div>
              <span className="text-gray-700 text-[16px] font-[500] pl-2">
                {metrics.avgTreatingHCOs.toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between">
              <div className="flex gap-2 items-center">
                <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                  <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
                </div>
                <span className="text-gray-500 text-[11px] font-[500]">Avg.Treated Patients per HCOs</span>
              </div>
              <span className="text-gray-700 text-[16px] font-[500] pl-2">
                {metrics.avgPatientsPerHCO.toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between">
              <div className="flex gap-2 items-center">
                <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                  <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
                </div>
                <span className="text-gray-500 text-[11px] font-[500]">Referring HCOs</span>
              </div>
              <span className="text-gray-700 text-[16px] font-[500] pl-2">
                {metrics.hcosReferringPatients.toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between">
              <div className="flex gap-2 items-center">
                <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                  <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
                </div>
                <span className="text-gray-500 text-[11px] font-[500]">Avg.Patients Referred per HCO</span>
              </div>
              <span className="text-gray-700 text-[16px] font-[500] pl-2">
                {metrics.avgPatientsReferredPerHCO.toLocaleString()}
              </span>
            </div>
          </div>

          <HCOchart
            HCOdata={filteredData}
            onGroupingClick={handleHcoGroupingSelect}
            selectedGrouping={selectedHcoGrouping}
          />
        </div>
      </div>

      <div className="flex w-full gap-4 p-2">
        <div className="flex flex-col bg-white rounded-xl border border-gray-300 w-[50%] shadow-sm">
          <div className="flex gap-2 items-center p-2">
            <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
              <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
            </div>
            <span className="text-gray-500 text-[11px] font-[500]">Top 10 HCPs by SMA Treated Patients Vol</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-blue-200 text-gray-700 text-[10px] font-medium">
                  <th className="p-2 text-left">HCP NPI</th>
                  <th className="p-2 text-left">HCP Name</th>
                  <th className="p-2 text-left">HCP Speciality</th>
                  <th className="p-2 text-left">ZOLGENSMA IV TARGET</th>
                  <th className="p-2 text-right">Treated pat. Vol</th>
                </tr>
              </thead>
              <tbody>
                {metrics.topHCPs.length > 0 ? (
                  metrics.topHCPs.map((hcp, index) => (
                    <tr key={index} className="border-t text-gray-800 text-[9px]">
                      <td onClick={() => getHCPDetails(hcp.name)} className="p-2 cursor-pointer">
                        {hcp.id}
                      </td>
                      <td onClick={() => getHCPDetails(hcp.name)} className="p-2 cursor-pointer">
                        {hcp.name}
                      </td>
                      <td className="p-2">{hcp.speciality}</td>
                      <td className="p-2">{hcp.kol}</td>
                      <td className="p-2 text-right">{hcp.volume}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="p-4 text-center text-gray-500">
                      No HCP data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col bg-white rounded-xl border border-gray-300 w-[50%]  shadow-sm">
          <div className="flex gap-2 items-center p-2">
            <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
              <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
            </div>
            <span className="text-gray-500 text-[11px] font-[500]">Top 10 HCOs by SMA Treated Patients Vol</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-blue-200 text-gray-700 text-[10px] font-medium">
                  <th className="p-2 text-left">HCO MDM ID</th>
                  <th className="p-2 text-left">HCO Name</th>

                  <th className="p-2 text-left">HCO Grouping</th>
                  <th className="p-2 text-left">HCO Archytype</th>
                  <th className="p-2 text-right">Treated pat. Vol</th>
                </tr>
              </thead>
              <tbody>
                {metrics.topHCOs.length > 0 ? (
                  metrics.topHCOs.map((hco, index) => (
                    <tr key={index} className="border-t text-gray-800 text-[9px]">
                      <td onClick={() => getHCODetails(hco.id)} className="p-2 cursor-pointer">
                        {hco.id}
                      </td>
                      <td onClick={() => getHCODetails(hco.id)} className="p-2 cursor-pointer">
                        {hco.name}
                      </td>
                      <td className="p-2">{hco.grouping}</td>
                      <td className="p-2"></td>
                      <td className="p-2 text-right">{hco.volume}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="p-4 text-center text-gray-500">
                      No HCO data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <span className="text-[10px] text-gray-500 mt-2 italic">
        Data source:
        <span className="text-[10px] font-[500] text-gray-500 mt-2 italic"> KOMODO APLD Claims: Jan'17 to Dec'24</span>
      </span>
    </>
  )
}

// Add the missing constant for state abbreviation to full name mapping
const ABBR_TO_STATE = {
  AL: "ALABAMA",
  AK: "ALASKA",
  AZ: "ARIZONA",
  AR: "ARKANSAS",
  CA: "CALIFORNIA",
  CO: "COLORADO",
  CT: "CONNECTICUT",
  DE: "DELAWARE",
  FL: "FLORIDA",
  GA: "GEORGIA",
  HI: "HAWAII",
  ID: "IDAHO",
  IL: "ILLINOIS",
  IN: "INDIANA",
  IA: "IOWA",
  KS: "KANSAS",
  KY: "KENTUCKY",
  LA: "LOUISIANA",
  ME: "MAINE",
  MD: "MARYLAND",
  MA: "MASSACHUSETTS",
  MI: "MICHIGAN",
  MN: "MINNESOTA",
  MS: "MISSISSIPPI",
  MO: "MISSOURI",
  MT: "MONTANA",
  NE: "NEBRASKA",
  NV: "NEVADA",
  NH: "NEW HAMPSHIRE",
  NJ: "NEW JERSEY",
  NM: "NEW MEXICO",
  NY: "NEW YORK",
  NC: "NORTH CAROLINA",
  ND: "NORTH DAKOTA",
  OH: "OHIO",
  OK: "OKLAHOMA",
  OR: "OREGON",
  PA: "PENNSYLVANIA",
  RI: "RHODE ISLAND",
  SC: "SOUTH CAROLINA",
  SD: "SOUTH DAKOTA",
  TN: "TENNESSEE",
  TX: "TEXAS",
  UT: "UTAH",
  VT: "VERMONT",
  VA: "VIRGINIA",
  WA: "WASHINGTON",
  WV: "WEST VIRGINIA",
  WI: "WISCONSIN",
  WY: "WYOMING",
  DC: "DISTRICT OF COLUMBIA",
}

export default Overview
