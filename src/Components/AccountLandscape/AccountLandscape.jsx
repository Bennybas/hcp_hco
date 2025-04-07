"use client"

import { useState, useEffect, useRef } from "react"
import { FaUserDoctor } from "react-icons/fa6"
import { ChevronDown, MoveUpRight } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend, LabelList } from "recharts"
import { ComposableMap, Geographies, Geography } from "react-simple-maps"
import { useNavigate } from "react-router-dom"

const AccountLandscape = () => {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [openDropdown, setOpenDropdown] = useState(null)
  const dataFetchedRef = useRef(false)

  // State for KPI metrics
  const [kpiData, setKpiData] = useState({
    renderingHCOs: 0,
    patientsLast12M: 0,
    avgPatientsPerHCO: 0,
    patientsReferred: 0,
    referringHCOs: 0,
  })

  // State for chart data
  const [facilityTypeData, setFacilityTypeData] = useState([])
  const [hcoTierData, setHcoTierData] = useState([])
  const [accountTableData, setAccountTableData] = useState([])
  const [allAccountTableData, setAllAccountTableData] = useState([])
  const [facilityTypeByQuarterData, setFacilityTypeByQuarterData] = useState([])

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // State for filters
  const [filters, setFilters] = useState({
    year: "All", // Default to All years
    ageFilter: "All",
    brand: "All",
    state: "All",
    kol: "All",
    zolgPrescriber: "All",
    zolgIVTarget: "All",
  })

  // Filter options
  const [filterOptions, setFilterOptions] = useState({
    years: ["All"],
    ages: ["All"],
    brands: ["All"],
    states: ["All"],
  })

  // Fetch data only once when component mounts
  useEffect(() => {
    const fetchData = async () => {
      // Only fetch data if it hasn't been fetched before
      if (dataFetchedRef.current) return

      try {
        setLoading(true)
        // Fetch data without year filter to get all records
        const response = await fetch("http://127.0.0.1:5000/fetch-hcolandscape")
        const jsonData = await response.json()

        // Extract unique years from the data, excluding 2016 and 2025
        const years = [...new Set(jsonData.map((item) => item.year))]
          .filter((year) => year && year !== "-" && year !== "2016" && year !== "2025")
          .sort((a, b) => b - a) // Sort years in descending order

        // Update filter options with available years
        setFilterOptions((prev) => ({
          ...prev,
          years: ["All", ...years],
        }))

        // Set the data
        setData(jsonData)

        // Extract other filter options
        extractFilterOptions(jsonData)

        // Mark data as fetched
        dataFetchedRef.current = true

        setLoading(false)
      } catch (error) {
        console.error("Error fetching data:", error)
        setLoading(false)
      }
    }

    fetchData()
  }, []) // Empty dependency array ensures this runs only once on component mount

  // Process data when filters change
  useEffect(() => {
    if (data.length > 0) {
      processData()
    }
  }, [data, filters])

  // Update paginated table data when page or rows per page changes
  useEffect(() => {
    const startIndex = (currentPage - 1) * rowsPerPage
    const endIndex = startIndex + rowsPerPage
    setAccountTableData(allAccountTableData.slice(startIndex, endIndex))
  }, [currentPage, rowsPerPage, allAccountTableData])

  const extractFilterOptions = (data) => {
    // Extract unique age groups
    const ages = ["All", ...new Set(data.map((item) => item.age_group).filter((age) => age && age !== "-"))]

    // Extract unique brands (drug names)
    const brands = ["All", ...new Set(data.map((item) => item.drug_name).filter((brand) => brand && brand !== "-"))]

    // Extract unique states
    const states = ["All", ...new Set(data.map((item) => item.hco_state).filter((state) => state && state !== "-"))]

    setFilterOptions((prev) => ({
      ...prev,
      ages,
      brands,
      states,
    }))
  }

  const processData = () => {
    // Apply filters to get filtered data
    const filteredData = getFilteredData()

    // Calculate KPI metrics
    calculateKPIMetrics(filteredData)

    // Process facility type data
    processFacilityTypeData(filteredData)

    // Process facility type by quarter data
    processFacilityTypeByQuarterData(filteredData)

    // Process HCO tier data
    processHcoTierData(filteredData)

    // Process accounts table data
    processAccountsTableData(filteredData)
  }

  const getFilteredData = () => {
    return data.filter((item) => {
      // Year filter
      if (filters.year !== "All" && item.year !== filters.year) return false

      // Age filter
      if (filters.ageFilter !== "All" && item.age_group !== filters.ageFilter) return false

      // Brand filter
      if (filters.brand !== "All" && item.drug_name !== filters.brand) return false

      // State filter
      if (filters.state !== "All" && item.hco_state !== filters.state) return false

      // KOL filter
      if (filters.kol !== "All" && item.kol !== filters.kol) return false

      // Zolgensma prescriber filter
      if (filters.zolgPrescriber !== "All" && item.zolg_prescriber !== filters.zolgPrescriber) return false

      // Zolgensma IV target filter
      if (filters.zolgIVTarget !== "All" && item.zolgensma_iv_target !== filters.zolgIVTarget) return false

      return true
    })
  }

  const calculateKPIMetrics = (filteredData) => {
    // Count unique rendering HCOs (rend_hco_npi)
    const renderingHCOs = new Set(filteredData.map((item) => item.rend_hco_npi).filter((npi) => npi && npi !== "-"))
      .size

    // Count unique patients
    const uniquePatients = new Set(filteredData.map((item) => item.patient_id).filter((id) => id && id !== "-")).size

    // Calculate average patients per HCO
    const avgPatientsPerHCO = renderingHCOs > 0 ? uniquePatients / renderingHCOs : 0

    // Count patients referred (where ref_hco_npi_mdm is not "-")
    const referredPatients = new Set(
      filteredData
        .filter((item) => item.ref_hco_npi_mdm && item.ref_hco_npi_mdm !== "-")
        .map((item) => item.patient_id)
        .filter((id) => id && id !== "-"),
    ).size

    // Count unique referring HCOs (ref_hco_npi_mdm)
    const referringHCOs = new Set(filteredData.map((item) => item.ref_hco_npi_mdm).filter((npi) => npi && npi !== "-"))
      .size

    setKpiData({
      renderingHCOs,
      patientsLast12M: uniquePatients,
      avgPatientsPerHCO,
      patientsReferred: referredPatients,
      referringHCOs,
    })
  }

  const processFacilityTypeData = (filteredData) => {
    // Group by hco_grouping and count unique patients
    const groupingMap = new Map()

    filteredData.forEach((item) => {
      if (item.hco_grouping && item.hco_grouping !== "-" && item.patient_id && item.patient_id !== "-") {
        if (!groupingMap.has(item.hco_grouping)) {
          groupingMap.set(item.hco_grouping, new Set())
        }
        groupingMap.get(item.hco_grouping).add(item.patient_id)
      }
    })

    // Convert to array format for chart
    const colors = [
      "#00599D", // Keep this as the primary blue
      "#4A7D99", // Darker than #6A99B5
      "#52C97C", // Darker than #7DFFA8
      "#C087CB", // Darker than #F0C3F7
      "#91BDD8", // Darker than #C8E3F5
    ]

    const result = Array.from(groupingMap.entries())
      .map(([name, patients], index) => ({
        name,
        value: patients.size,
        color: colors[index % colors.length],
      }))
      .sort((a, b) => b.value - a.value) // Sort by value in descending order

    setFacilityTypeData(result)
  }

  const processFacilityTypeByQuarterData = (filteredData) => {
    // Group by year, quarter, and facility type
    const yearQuarterFacilityMap = new Map()

    // Get unique facility types (excluding "-")
    const facilityTypes = [
      ...new Set(filteredData.map((item) => item.hco_grouping).filter((type) => type && type !== "-")),
    ]

    // Process each record
    filteredData.forEach((item) => {
      if (
        item.year &&
        item.quarter &&
        item.hco_grouping &&
        item.patient_id &&
        item.year !== "-" &&
        item.quarter !== "-" &&
        item.hco_grouping !== "-" &&
        item.patient_id !== "-"
      ) {
        // Skip 2016 and 2025 data
        if (item.year === "2016" || item.year === "2025") return

        // Create a key for this year-quarter combination
        const yearQuarterKey = `${item.year}-Q${item.quarter}`

        // Initialize this year-quarter entry if it doesn't exist
        if (!yearQuarterFacilityMap.has(yearQuarterKey)) {
          const entry = {
            yearQuarter: yearQuarterKey,
            year: item.year,
            quarter: `Q${item.quarter}`,
            displayOrder: Number.parseInt(item.year) * 10 + Number.parseInt(item.quarter),
          }

          // Initialize counts for each facility type to 0
          facilityTypes.forEach((type) => {
            entry[type] = 0
          })

          yearQuarterFacilityMap.set(yearQuarterKey, entry)
        }

        // Get the current entry
        const entry = yearQuarterFacilityMap.get(yearQuarterKey)

        // Increment the count for this facility type
        if (entry[item.hco_grouping] !== undefined) {
          entry[item.hco_grouping] += 1
        } else {
          entry[item.hco_grouping] = 1
        }
      }
    })

    // Convert to array and sort by year and quarter
    const result = Array.from(yearQuarterFacilityMap.values())

    // Sort by year and quarter
    result.sort((a, b) => a.displayOrder - b.displayOrder)

    // Add yearLabel property - only set for the first quarter of each year
    const processedYears = new Set()
    result.forEach((item) => {
      if (!processedYears.has(item.year)) {
        item.yearLabel = item.year
        processedYears.add(item.year)
      } else {
        item.yearLabel = ""
      }
    })

    // Set the data for the chart
    setFacilityTypeByQuarterData(result)
  }

  const processHcoTierData = (filteredData) => {
    // Group by hco_mdm_tier and count unique HCOs
    const tierMap = new Map()

    filteredData.forEach((item) => {
      if (item.hco_mdm_tier && item.hco_mdm_tier !== "-" && item.rend_hco_npi && item.rend_hco_npi !== "-") {
        if (!tierMap.has(item.hco_mdm_tier)) {
          tierMap.set(item.hco_mdm_tier, new Set())
        }
        tierMap.get(item.hco_mdm_tier).add(item.rend_hco_npi)
      }
    })

    // Convert to array format for chart
    const colors = ["#B073FE", "#FDBA74", "#B4F06C", "#6EE79A"]

    // Sort tier entries - assuming tier is like "Tier 1", "Tier 2", etc.
    const sortedEntries = Array.from(tierMap.entries()).sort(([a], [b]) => {
      const aNum = Number.parseInt(a.replace(/\D/g, ""), 10) || 0
      const bNum = Number.parseInt(b.replace(/\D/g, ""), 10) || 0
      return aNum - bNum
    })

    const result = sortedEntries.map(([label, hcoSet], index) => ({
      label,
      value: hcoSet.size,
      color: colors[index % colors.length],
    }))

    setHcoTierData(result)
  }

  const processAccountsTableData = (filteredData) => {
    // Group by rend_hco_npi to get unique accounts
    const accountsMap = new Map()

    filteredData.forEach((item) => {
      if (item.rend_hco_npi && item.rend_hco_npi !== "-") {
        const hcoId = item.rend_hco_npi

        if (!accountsMap.has(hcoId)) {
          accountsMap.set(hcoId, {
            accountId: hcoId,
            hcps: new Set(),
            patients: new Set(),
            affiliatedAccount: item.hco_mdm_name || "-",
            tier: item.hco_mdm_tier || "-",
            archetype: item.hco_grouping || "-",
            state: item.hco_state || "-",
          })
        }

        const account = accountsMap.get(hcoId)
        // Add HCP if it exists
        if (item.hcp_id && item.hcp_id !== "-") {
          account.hcps.add(item.hcp_id)
        }
        // Add patient if it exists
        if (item.patient_id && item.patient_id !== "-") {
          account.patients.add(item.patient_id)
        }
      }
    })

    // Convert to array and format for table
    const accountsArray = Array.from(accountsMap.values()).map((account) => ({
      ...account,
      hcps: account.hcps.size,
      patients: account.patients.size,
    }))

    // Sort by patient count in descending order
    accountsArray.sort((a, b) => b.patients - a.patients)

    // Add rank and format for table
    const result = accountsArray.map((account, index) => ({
      Rank: `0${index + 1}`,
      "Account ID": account.accountId,
      "No. HCPs": account.hcps,
      "SMA. Patients": account.patients,
      "Affiliated Account": account.affiliatedAccount,
      "Account Tier": account.tier,
      "Account Archetype": account.archetype,
    }))

    // Store all table data
    setAllAccountTableData(result)

    // Set paginated data
    const startIndex = (currentPage - 1) * rowsPerPage
    const endIndex = startIndex + rowsPerPage
    setAccountTableData(result.slice(startIndex, endIndex))
  }

  // Handle filter changes
  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: value,
    }))

    // Reset to first page when filters change
    setCurrentPage(1)

    // Close dropdown after selection
    setOpenDropdown(null)
  }

  // Toggle filter buttons
  const toggleFilter = (filterName, value) => {
    handleFilterChange(filterName, filters[filterName] === value ? "All" : value)
  }

  // Toggle dropdown
  const toggleDropdown = (dropdown) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown)
  }

  // Handle page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage)
  }

  // Handle rows per page change
  const handleRowsPerPageChange = (newRowsPerPage) => {
    setRowsPerPage(newRowsPerPage)
    setCurrentPage(1) // Reset to first page when changing rows per page
  }

  // Navigate to HCO details
  const getHCODetails = (hcoId) => {
    navigate("/hco", { state: { hco_id: hcoId } })
  }

  // Calculate max value for HCO tier data
  const maxValue = hcoTierData.length > 0 ? Math.max(...hcoTierData.map((item) => item.value), 0) : 0

  // Calculate total pages
  const totalPages = Math.ceil(allAccountTableData.length / rowsPerPage)

  // Map data (using static data for now as it's not part of the API)
  const healthcareData = {
    "01": { abbr: "AL", patients: 127, hcps: 45, adoptionRate: 68 },
    "02": { abbr: "AK", patients: 25, hcps: 12, adoptionRate: 55 },
    "04": { abbr: "AZ", patients: 192, hcps: 83, adoptionRate: 72 },
    "05": { abbr: "AR", patients: 95, hcps: 37, adoptionRate: 65 },
    "06": { abbr: "CA", patients: 873, hcps: 264, adoptionRate: 82 },
    "08": { abbr: "CO", patients: 177, hcps: 67, adoptionRate: 75 },
    "09": { abbr: "CT", patients: 128, hcps: 51, adoptionRate: 73 },
    10: { abbr: "DE", patients: 31, hcps: 16, adoptionRate: 69 },
    11: { abbr: "DC", patients: 24, hcps: 15, adoptionRate: 71 },
    12: { abbr: "FL", patients: 640, hcps: 221, adoptionRate: 78 },
    13: { abbr: "GA", patients: 274, hcps: 95, adoptionRate: 74 },
    15: { abbr: "HI", patients: 54, hcps: 21, adoptionRate: 62 },
    16: { abbr: "ID", patients: 58, hcps: 28, adoptionRate: 67 },
    17: { abbr: "IL", patients: 391, hcps: 136, adoptionRate: 76 },
    18: { abbr: "IN", patients: 247, hcps: 83, adoptionRate: 71 },
    19: { abbr: "IA", patients: 143, hcps: 56, adoptionRate: 69 },
    20: { abbr: "KS", patients: 129, hcps: 47, adoptionRate: 66 },
    21: { abbr: "KY", patients: 167, hcps: 62, adoptionRate: 68 },
    22: { abbr: "LA", patients: 186, hcps: 73, adoptionRate: 64 },
    23: { abbr: "ME", patients: 62, hcps: 24, adoptionRate: 70 },
    24: { abbr: "MD", patients: 245, hcps: 92, adoptionRate: 74 },
    25: { abbr: "MA", patients: 293, hcps: 104, adoptionRate: 80 },
    26: { abbr: "MI", patients: 373, hcps: 135, adoptionRate: 75 },
    27: { abbr: "MN", patients: 206, hcps: 78, adoptionRate: 76 },
    28: { abbr: "MS", patients: 104, hcps: 38, adoptionRate: 63 },
    29: { abbr: "MO", patients: 234, hcps: 88, adoptionRate: 70 },
    30: { abbr: "MT", patients: 48, hcps: 19, adoptionRate: 61 },
    31: { abbr: "NE", patients: 83, hcps: 34, adoptionRate: 67 },
    32: { abbr: "NV", patients: 153, hcps: 58, adoptionRate: 71 },
    33: { abbr: "NH", patients: 57, hcps: 23, adoptionRate: 74 },
    34: { abbr: "NJ", patients: 382, hcps: 138, adoptionRate: 77 },
    35: { abbr: "NM", patients: 88, hcps: 32, adoptionRate: 68 },
    36: { abbr: "NY", patients: 672, hcps: 241, adoptionRate: 81 },
    37: { abbr: "NC", patients: 358, hcps: 129, adoptionRate: 76 },
    38: { abbr: "ND", patients: 37, hcps: 15, adoptionRate: 65 },
    39: { abbr: "OH", patients: 421, hcps: 148, adoptionRate: 73 },
    40: { abbr: "OK", patients: 163, hcps: 63, adoptionRate: 69 },
    41: { abbr: "OR", patients: 147, hcps: 59, adoptionRate: 72 },
    42: { abbr: "PA", patients: 523, hcps: 187, adoptionRate: 78 },
    44: { abbr: "RI", patients: 43, hcps: 18, adoptionRate: 74 },
    45: { abbr: "SC", patients: 174, hcps: 64, adoptionRate: 70 },
    46: { abbr: "SD", patients: 43, hcps: 17, adoptionRate: 66 },
    47: { abbr: "TN", patients: 238, hcps: 89, adoptionRate: 72 },
    48: { abbr: "TX", patients: 812, hcps: 283, adoptionRate: 79 },
    49: { abbr: "UT", patients: 101, hcps: 40, adoptionRate: 71 },
    50: { abbr: "VT", patients: 26, hcps: 12, adoptionRate: 68 },
    51: { abbr: "VA", patients: 316, hcps: 115, adoptionRate: 74 },
    53: { abbr: "WA", patients: 231, hcps: 89, adoptionRate: 75 },
    54: { abbr: "WV", patients: 58, hcps: 22, adoptionRate: 64 },
    55: { abbr: "WI", patients: 198, hcps: 76, adoptionRate: 72 },
    56: { abbr: "WY", patients: 29, hcps: 13, adoptionRate: 63 },
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 w-full p-2">
      {/* Filters */}
      <div className="flex gap-4 items-center flex-wrap">
        {/* Year Filter */}
        <div className="relative">
          <div
            className="flex items-center py-1 px-2 rounded-lg bg-white justify-between cursor-pointer min-w-[100px]"
            onClick={() => toggleDropdown("year")}
          >
            <span className="text-[12px] text-gray-600">Year: {filters.year}</span>
            <ChevronDown className="w-4 h-4" />
          </div>
          {openDropdown === "year" && (
            <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-md z-10 w-full max-h-40 overflow-y-auto">
              {filterOptions.years.map((year) => (
                <div
                  key={year}
                  className={`p-2 text-[12px] hover:bg-gray-100 cursor-pointer ${
                    filters.year === year ? "bg-blue-50 text-blue-600" : ""
                  }`}
                  onClick={() => handleFilterChange("year", year)}
                >
                  {year}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Age Filter */}
        <div className="relative">
          <div
            className="flex items-center py-1 px-2 rounded-lg bg-white justify-between cursor-pointer min-w-[120px]"
            onClick={() => toggleDropdown("age")}
          >
            <span className="text-[12px] text-gray-600">Age: {filters.ageFilter}</span>
            <ChevronDown className="w-4 h-4" />
          </div>
          {openDropdown === "age" && (
            <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-md z-10 w-full max-h-40 overflow-y-auto">
              {filterOptions.ages.map((age) => (
                <div
                  key={age}
                  className={`p-2 text-[12px] hover:bg-gray-100 cursor-pointer ${
                    filters.ageFilter === age ? "bg-blue-50 text-blue-600" : ""
                  }`}
                  onClick={() => handleFilterChange("ageFilter", age)}
                >
                  {age}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Brand Filter */}
        <div className="relative">
          <div
            className="flex items-center py-1 px-2 rounded-lg bg-white justify-between cursor-pointer min-w-[120px]"
            onClick={() => toggleDropdown("brand")}
          >
            <span className="text-[12px] text-gray-600">Brand: {filters.brand}</span>
            <ChevronDown className="w-4 h-4" />
          </div>
          {openDropdown === "brand" && (
            <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-md z-10 w-full max-h-40 overflow-y-auto">
              {filterOptions.brands.map((brand) => (
                <div
                  key={brand}
                  className={`p-2 text-[12px] hover:bg-gray-100 cursor-pointer ${
                    filters.brand === brand ? "bg-blue-50 text-blue-600" : ""
                  }`}
                  onClick={() => handleFilterChange("brand", brand)}
                >
                  {brand}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* State Filter */}
        <div className="relative">
          <div
            className="flex items-center py-1 px-2 rounded-lg bg-white justify-between cursor-pointer min-w-[120px]"
            onClick={() => toggleDropdown("state")}
          >
            <span className="text-[12px] text-gray-600">State: {filters.state}</span>
            <ChevronDown className="w-4 h-4" />
          </div>
          {openDropdown === "state" && (
            <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-md z-10 w-full max-h-40 overflow-y-auto">
              {filterOptions.states.map((state) => (
                <div
                  key={state}
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

        {/* KOL Filter */}
        <div className="flex items-center rounded-xl border py-1 gap-2 bg-white px-2">
          <span className="text-gray-600 text-[10px]">KOL</span>
          <button
            onClick={() => toggleFilter("kol", "Yes")}
            className={`text-${filters.kol === "Yes" ? "blue-600" : "gray-600"} text-[9px] bg-${filters.kol === "Yes" ? "blue" : "gray"}-100 rounded-md px-1`}
          >
            Yes
          </button>
          <button
            onClick={() => toggleFilter("kol", "No")}
            className={`text-${filters.kol === "No" ? "blue-600" : "gray-600"} text-[9px] bg-${filters.kol === "No" ? "blue" : "gray"}-100 rounded-md px-1`}
          >
            No
          </button>
        </div>

        {/* Zolgensma Prescriber Filter */}
        <div className="flex items-center rounded-xl border py-1 gap-2 bg-white px-2">
          <span className="text-gray-600 text-[10px]">Zolgensma Prescriber</span>
          <button
            onClick={() => toggleFilter("zolgPrescriber", "Yes")}
            className={`text-${filters.zolgPrescriber === "Yes" ? "blue-600" : "gray-600"} text-[9px] bg-${filters.zolgPrescriber === "Yes" ? "blue" : "gray"}-100 rounded-md px-1`}
          >
            Yes
          </button>
          <button
            onClick={() => toggleFilter("zolgPrescriber", "No")}
            className={`text-${filters.zolgPrescriber === "No" ? "blue-600" : "gray-600"} text-[9px] bg-${filters.zolgPrescriber === "No" ? "blue" : "gray"}-100 rounded-md px-1`}
          >
            No
          </button>
        </div>

        {/* Zolgensma IV Target Filter */}
        <div className="flex items-center rounded-xl border py-1 gap-2 bg-white px-2">
          <span className="text-gray-600 text-[10px]">Zolgensma IV Target</span>
          <button
            onClick={() => toggleFilter("zolgIVTarget", "Yes")}
            className={`text-${filters.zolgIVTarget === "Yes" ? "blue-600" : "gray-600"} text-[9px] bg-${filters.zolgIVTarget === "Yes" ? "blue" : "gray"}-100 rounded-md px-1`}
          >
            Yes
          </button>
          <button
            onClick={() => toggleFilter("zolgIVTarget", "No")}
            className={`text-${filters.zolgIVTarget === "No" ? "blue-600" : "gray-600"} text-[9px] bg-${filters.zolgIVTarget === "No" ? "blue" : "gray"}-100 rounded-md px-1`}
          >
            No
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="flex gap-4 w-full">
        <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[20%] h-20 p-2 justify-between">
          <div className="flex gap-2 items-center">
            <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
              <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
            </div>
            <span className="text-gray-500 text-[11px] font-[500]">Rendering HCOs</span>
          </div>
          <span className="text-gray-700 text-[16px] font-[500] pl-2">{kpiData.renderingHCOs}</span>
        </div>
        <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[20%] h-20 p-2 justify-between">
          <div className="flex flex-col justify-between h-full">
            <div className="flex gap-2 items-center">
              <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
              </div>
              <span className="text-gray-500 text-[11px] font-[500]">SMA Patients Treated in Last 12M</span>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-gray-700 text-[16px] font-[500]">{kpiData.patientsLast12M}</span>
              {/* <MoveUpRight className="text-green-500 ml-2" style={{ width: "10px", height: "10px" }} />
              <span className="text-green-500 text-xs">5.2%</span>
              <span className="text-gray-500 text-xs">vs last month</span> */}
            </div>
          </div>
        </div>

        <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[20%] h-20 p-2 justify-between">
          <div className="flex gap-2 items-center">
            <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
              <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
            </div>
            <span className="text-gray-500 text-[11px] font-[500]">Avg #Pats Treated per HCOs</span>
          </div>
          <span className="text-gray-700 text-[16px] font-[500] pl-2">{kpiData.avgPatientsPerHCO.toFixed(2)}</span>
        </div>

        <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[20%] h-20 p-2 justify-between">
          <div className="flex gap-2 items-center">
            <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
              <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
            </div>
            <span className="text-gray-500 text-[11px] font-[500]">SMA Patients Referred in Last 12M</span>
          </div>
          <span className="text-gray-700 text-[16px] font-[500] pl-2">{kpiData.patientsReferred}</span>
        </div>

        <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[20%] h-20 p-2 justify-between">
          <div className="flex gap-2 items-center">
            <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
              <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
            </div>
            <span className="text-gray-500 text-[11px] font-[500]">Referring HCOs</span>
          </div>
          <span className="text-gray-700 text-[16px] font-[500] pl-2">{kpiData.referringHCOs}</span>
        </div>
      </div>

      {/* Facility Type by Quarter Chart - Full Width */}
      <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-56 p-2">
        <span className="text-gray-500 text-[11px] font-[500] pb-4">Accounts by Facility Type</span>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={facilityTypeByQuarterData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="quarter" tick={{ fontSize: 10 }} interval={0} tickFormatter={(value) => value} />
            <XAxis
              dataKey="yearLabel"
              axisLine={false}
              tickLine={false}
              interval={0}
              tick={{ fontSize: 11, dx: 40 }}
              height={20}
              xAxisId="year"
              tickFormatter={(value) => value}
            />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 10 }} itemStyle={{ fontSize: 10 }} />
            <Legend wrapperStyle={{ fontSize: 9 }} />
            {facilityTypeByQuarterData.length > 0 &&
              (() => {
                // Get all the facility type keys
                const facilityKeys = Object.keys(facilityTypeByQuarterData[0]).filter(
                  (key) => !["yearQuarter", "year", "quarter", "displayOrder", "yearLabel", "total"].includes(key),
                )

                // Define a set of colors for the bars
                const colors = ["#00599D", "#4A7D99", "#52C97C", "#C087CB", "#91BDD8", "#E6A0C4", "#8884d8", "#82ca9d"]

                // Process the data to add total values
                facilityTypeByQuarterData.forEach((entry) => {
                  let total = 0
                  facilityKeys.forEach((key) => {
                    total += entry[key] || 0
                  })
                  entry.total = total
                })

                // Return the bars with the last one having a label
                return facilityKeys.map((key, index) => {
                  const isLastKey = index === facilityKeys.length - 1
                  return (
                    <Bar key={key} dataKey={key} stackId="a" fill={colors[index % colors.length]} name={key}>
                      {isLastKey && (
                        <LabelList
                          dataKey="total"
                          position="top"
                          offset={5}
                          fill="#333"
                          fontSize={9}
                          fontWeight="15px"
                        />
                      )}
                    </Bar>
                  )
                })
              })()}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Charts - Second Row */}
      <div className="flex gap-4 w-full">
        <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[40%] h-60 p-2">
          <span className="text-gray-500 text-[11px] font-[500] pb-4">HCO Tier by SMA Patients Potential</span>
          <div className="flex flex-col space-y-3 flex-grow justify-around pr-2">
            {hcoTierData.map((item, index) => (
              <div key={index} className="flex flex-col items-center w-full">
                <div className="flex items-center w-full">
                  <span className="text-gray-500 text-[10px] w-[120px] shrink-0 mr-2">{item.label}</span>
                </div>
                <div className="flex items-center w-full">
                  <div className="flex-grow bg-gray-100 rounded-full h-[6px] mr-2">
                    <div
                      className="h-[6px] rounded-full"
                      style={{
                        width: `${(item.value / maxValue) * 100}%`,
                        backgroundColor: item.color,
                      }}
                    ></div>
                  </div>
                  <span className="text-gray-600 text-[10px] font-medium w-[20px] text-right">{item.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[60%] h-60 p-2">
          <ComposableMap projection="geoAlbersUsa">
            <Geographies geography="https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json">
              {({ geographies }) =>
                geographies.map((geo) => {
                  const stateData = healthcareData[geo.id] || {}
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={stateData.adoptionRate > 70 ? "#4f93c0" : "#a6cee3"}
                      stroke="#FFF"
                    />
                  )
                })
              }
            </Geographies>
          </ComposableMap>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="flex flex-col bg-white rounded-xl border border-gray-300 w-full shadow-sm">
        <div className="flex justify-between items-center p-2">
          <div className="flex gap-2 items-center">
            <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
              <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
            </div>
            <span className="text-gray-500 text-[11px] font-[500]">Accounts List</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-[11px]">Show rows:</span>
            <select
              className="border border-gray-300 rounded text-[11px] p-1"
              value={rowsPerPage}
              onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-blue-200 text-gray-700 text-[11px] font-medium">
                <th className="p-2 text-left">Rank</th>
                <th className="p-2 text-left">Account ID</th>
                <th className="p-2 text-left">No. HCPs</th>
                <th className="p-2 text-left">SMA. Patients</th>
                <th className="p-2 text-left">Affiliated Accounts</th>
                <th className="p-2 text-left">Account Tier</th>
                <th className="p-2 text-left">Account Archetype</th>
              </tr>
            </thead>

            <tbody>
              {accountTableData.map((hco, index) => (
                <tr key={index} className="border-t text-gray-800 text-[10px]">
                  <td className="p-2">{hco.Rank}</td>
                  <td onClick={() => getHCODetails(hco["Account ID"])} className="p-2 cursor-pointer">
                    {hco["Account ID"]}
                  </td>
                  <td className="p-2">{hco["No. HCPs"]}</td>
                  <td className="p-2">{hco["SMA. Patients"]}</td>
                  <td onClick={() => getHCODetails(hco["Account ID"])} className="p-2 cursor-pointer">
                    {hco["Affiliated Account"]}
                  </td>
                  <td className="p-2">{hco["Account Tier"]}</td>
                  <td className="p-2">{hco["Account Archetype"]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center py-2 border-t border-gray-200">
            <button
              className="px-2 py-1 text-[10px] text-gray-600 disabled:text-gray-400"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              Previous
            </button>

            <div className="flex mx-2">
              {(() => {
                // Calculate which group of 5 pages we're in
                const pageGroup = Math.ceil(currentPage / 5)
                const startPage = (pageGroup - 1) * 5 + 1
                const endPage = Math.min(startPage + 4, totalPages)

                return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map((page) => (
                  <button
                    key={page}
                    className={`w-6 h-6 mx-1 rounded-full text-[10px] ${
                      currentPage === page ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
                    }`}
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </button>
                ))
              })()}
            </div>

            <button
              className="px-2 py-1 text-[10px] text-gray-600 disabled:text-gray-400"
              disabled={Math.ceil(currentPage / 5) * 5 >= totalPages}
              onClick={() => {
                const nextGroupStart = Math.ceil(currentPage / 5) * 5 + 1
                handlePageChange(Math.min(nextGroupStart, totalPages))
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AccountLandscape