"use client"

import { useState, useEffect } from "react"
import { FaUserDoctor } from "react-icons/fa6"
import { ChevronDown } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, LabelList } from "recharts"
import { useNavigate } from "react-router-dom"
import api from '../api/api'

const HCPlandscape = () => {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [kpiData, setKpiData] = useState({
    renderingHCPs: 0,
    patientsLast12M: 0,
    avgPatientsPerHCP: 0,
    referringHCPs: 0,
    avgPatientsReferredPerHCP: 0,
  })
  const [brandData, setBrandData] = useState([])
  const [hcpsplit_age, setHcpsplitAge] = useState([])
  const [hcpsplit_specialty_data, setHcpsplitSpecialtyData] = useState([])
  const [potential_data, setPotentialData] = useState([])
  const [table_data, setTableData] = useState([])
  const [allTableData, setAllTableData] = useState([])
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Filters
  const [filters, setFilters] = useState({
    year: "All", // Default to All years
    brand: "All",
    age: "All",
  })

  // Filter options
  const [filterOptions, setFilterOptions] = useState({
    years: ["All"],
    brands: ["All"],
    ages: ["All"],
  })

  // Dropdown state
  const [openDropdown, setOpenDropdown] = useState(null)

  // Fetch data on component mount
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setIsLoading(true)
        // Fetch all data without year filter
        const response = await fetch(`${api}/fetch-hcplandscape`)
        const jsonData = await response.json()

        // Extract unique years from the data, filtering out 2016 and 2025
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

        // Process data for visualizations
        processData(jsonData)

        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching data:", error)
        setIsLoading(false)
      }
    }

    fetchAllData()
  }, []) // Empty dependency array ensures this runs only once on component mount

  // Fetch data when filters change
  useEffect(() => {
    if (data.length > 0) {
      // Filter data based on current filters
      const filteredData = getFilteredData()

      // Process filtered data
      processData(filteredData)
    }
  }, [filters])

  const getFilteredData = () => {
    return data.filter((item) => {
      // Year filter
      if (filters.year !== "All" && item.year !== filters.year) return false

      // Brand filter
      if (filters.brand !== "All" && item.drug_name !== filters.brand) return false

      // Age filter
      if (filters.age !== "All" && item.age_group !== filters.age) return false

      return true
    })
  }

  const extractFilterOptions = (data) => {
    // Extract unique brands and age groups
    const brands = ["All", ...new Set(data.map((item) => item.drug_name).filter((brand) => brand && brand !== "-"))]
    const ages = ["All", ...new Set(data.map((item) => item.age_group).filter((age) => age && age !== "-"))]

    // Get years but filter out 2016 and 2025
    const years = [...new Set(data.map((item) => item.year))]
      .filter((year) => year && year !== "-" && year !== "2016" && year !== "2025")
      .sort((a, b) => b - a) // Sort years in descending order

    setFilterOptions((prev) => ({
      ...prev,
      years: ["All", ...years],
      brands,
      ages,
    }))
  }

  const processData = (data) => {
    // Calculate KPI metrics
    calculateKPIMetrics(data)

    // Process brand data by year and quarter
    processAllYearsBrandData(data)

    // Process age group data
    processAgeGroupData(data)

    // Process specialty data
    processSpecialtyData(data)

    // Process potential data
    processPotentialData(data)

    // Process table data
    processTableData(data)
  }

  const calculateKPIMetrics = (data) => {
    // Count unique rendering HCPs (rend_npi)
    const renderingHCPs = new Set(data.map((item) => item.rend_npi).filter((npi) => npi && npi !== "-")).size

    // Count unique patients
    const uniquePatients = new Set(data.map((item) => item.patient_id).filter((id) => id && id !== "-")).size

    // Calculate average patients per HCP
    const avgPatientsPerHCP = renderingHCPs > 0 ? (uniquePatients / renderingHCPs).toFixed(1) : "0.0"

    // Count unique referring HCPs (ref_npi)
    const referringHCPs = new Set(data.map((item) => item.ref_npi).filter((npi) => npi && npi !== "-")).size

    // Count referred patients
    const referredPatients = new Set(
      data
        .filter((item) => item.ref_npi && item.ref_npi !== "-")
        .map((item) => item.patient_id)
        .filter((id) => id && id !== "-"),
    ).size

    // Calculate average patients referred per HCP
    const avgPatientsReferredPerHCP = referringHCPs > 0 ? (referredPatients / referringHCPs).toFixed(1) : "0.0"

    setKpiData({
      renderingHCPs,
      patientsLast12M: uniquePatients,
      avgPatientsPerHCP,
      referringHCPs,
      avgPatientsReferredPerHCP,
    })
  }

  const processAllYearsBrandData = (data) => {
    // Group patients by year, quarter and drug
    const yearQuarterDrugCounts = {}

    data.forEach((item) => {
      if (
        item.year &&
        item.quarter &&
        item.drug_name &&
        item.drug_name !== "-" &&
        item.patient_id &&
        item.patient_id !== "-"
      ) {
        // Skip 2016 and 2025 data
        if (item.year === "2016" || item.year === "2025") return

        const year = item.year
        const quarter = Number.parseInt(item.quarter)
        const key = `${year}-Q${quarter}`

        if (!yearQuarterDrugCounts[key]) {
          yearQuarterDrugCounts[key] = {
            year,
            quarter,
            displayQuarter: `Q${quarter}`,
            displayYear: year,
            ZOLGENSMA: new Set(),
            SPINRAZA: new Set(),
            EVRYSDI: new Set(),
          }
        }

        if (yearQuarterDrugCounts[key][item.drug_name]) {
          yearQuarterDrugCounts[key][item.drug_name].add(item.patient_id)
        }
      }
    })

    // Format for chart - group by year first
    const yearGroups = {}

    Object.entries(yearQuarterDrugCounts).forEach(([key, data]) => {
      const year = data.year
      if (!yearGroups[year]) {
        yearGroups[year] = []
      }

      yearGroups[year].push({
        quarter: data.displayQuarter,
        year: data.displayYear,
        quarterNum: data.quarter,
        sortKey: `${data.year}-${data.quarter.toString().padStart(2, "0")}`,
        Zolgensma: data.ZOLGENSMA ? data.ZOLGENSMA.size : 0,
        Spinraza: data.SPINRAZA ? data.SPINRAZA.size : 0,
        Evrysdi: data.EVRYSDI ? data.EVRYSDI.size : 0,
      })
    })

    // Sort quarters within each year and flatten
    const formattedBrandData = []

    // Sort years chronologically
    const sortedYears = Object.keys(yearGroups).sort()

    sortedYears.forEach((year) => {
      // Sort quarters within the year
      const yearData = yearGroups[year].sort((a, b) => a.quarterNum - b.quarterNum)

      // Add a yearLabel property to the first quarter of each year
      yearData.forEach((item, index) => {
        item.yearLabel = index === 0 ? year : ""
        // Add total for each quarter
        item.total = item.Zolgensma + item.Spinraza + item.Evrysdi
      })

      formattedBrandData.push(...yearData)
    })

    setBrandData(formattedBrandData)
  }

  const processAgeGroupData = (data) => {
    // Get unique segments
    const segments = [...new Set(data.map((item) => item.hcp_segment).filter((segment) => segment && segment !== "-"))]

    // Create a map to track unique HCP IDs for each segment and age group
    const segmentAgeHcpMap = new Map()

    data.forEach((item) => {
      if (
        item.hcp_segment &&
        item.rend_npi &&
        item.age_group &&
        item.hcp_segment !== "-" &&
        item.rend_npi !== "-" &&
        item.age_group !== "-"
      ) {
        const key = `${item.hcp_segment}_${item.age_group}`

        if (!segmentAgeHcpMap.has(key)) {
          segmentAgeHcpMap.set(key, new Set())
        }

        segmentAgeHcpMap.get(key).add(item.rend_npi)
      }
    })

    // Format for chart
    const ageGroupData = segments.map((segment) => {
      const result = { segment }
    
      // Map age groups to chart categories
      const ageMapping = {
        "0 to 2": "<2",
        "3 to 17": "3-17",
        "Above 18": ">18",
      }
    
      // Initialize all age groups to 0
      Object.values(ageMapping).forEach((chartAge) => {
        result[chartAge] = 0
      })
    
      // Fill in counts for each age group
      Object.entries(ageMapping).forEach(([apiAge, chartAge]) => {
        const key = `${segment}_${apiAge}`
        if (segmentAgeHcpMap.has(key)) {
          result[chartAge] = segmentAgeHcpMap.get(key).size
        }
      })
    
      // Calculate total for each segment
      const total = result["<2"] + result["3-17"] + result[">18"]
      result.total = total
    
      // Calculate percentage values for 100% stacked bar
      if (total > 0) {
        result["<2"] = ((result["<2"] / total) * 100).toFixed(2)
        result["3-17"] = ((result["3-17"] / total) * 100).toFixed(2)
        result[">18"] = ((result[">18"] / total) * 100).toFixed(2)
      }
    
      return result
    })
    
    setHcpsplitAge(ageGroupData)    
  }

  const processSpecialtyData = (data) => {
    // Get unique segments
    const segments = [...new Set(data.map((item) => item.hcp_segment).filter((segment) => segment && segment !== "-"))]

    // Create a map to track unique HCP IDs for each segment and specialty
    const segmentSpecialtyHcpMap = new Map()

    data.forEach((item) => {
      if (
        item.hcp_segment &&
        item.rend_npi &&
        item.final_spec &&
        item.hcp_segment !== "-" &&
        item.rend_npi !== "-" &&
        item.final_spec !== "-"
      ) {
        const specialty = item.final_spec.toUpperCase()
        const key = `${item.hcp_segment}_${specialty}`

        if (!segmentSpecialtyHcpMap.has(key)) {
          segmentSpecialtyHcpMap.set(key, new Set())
        }

        segmentSpecialtyHcpMap.get(key).add(item.rend_npi)
      }
    })

    // Format for chart
    const specialtyData = segments.map((segment) => {
      const result = { segment }
    
      // Define specialty categories for the chart
      const specialtyCategories = {
        PEDIATRIC: "Pediatric",
        "CHILD NEUROLOGY": "Child Neurology",
        NEUROLOGY: "Neurology",
        NEUROMUSCULAR: "Neuromuscular",
        "NP/PA": "NP/PA",
        RADIOLOGY: "Radiology",
      }
    
      // Initialize all specialty categories to 0
      Object.values(specialtyCategories).forEach((chartSpecialty) => {
        result[chartSpecialty] = 0
      })
    
      // Add "All Others" category
      result["All Others"] = 0
    
      // Fill in counts for each specialty
      Object.entries(specialtyCategories).forEach(([apiSpecialty, chartSpecialty]) => {
        const key = `${segment}_${apiSpecialty}`
        if (segmentSpecialtyHcpMap.has(key)) {
          result[chartSpecialty] = segmentSpecialtyHcpMap.get(key).size
        }
      })
    
      // Count "All Others" - specialties not in our predefined categories
      segmentSpecialtyHcpMap.forEach((hcps, key) => {
        if (key.startsWith(`${segment}_`)) {
          const specialty = key.substring(segment.length + 1)
          if (!Object.keys(specialtyCategories).includes(specialty)) {
            result["All Others"] += hcps.size
          }
        }
      })
    
      // Calculate total for the segment
      const total =
        result["Pediatric"] +
        result["Child Neurology"] +
        result["Neurology"] +
        result["Neuromuscular"] +
        result["NP/PA"] +
        result["All Others"]
    
      result.total = total
    
      // Convert to percentage for 100% stacked chart
      if (total > 0) {
        Object.keys(result).forEach((key) => {
          if (key !== "segment" && key !== "total") {
            result[key] = ((result[key] / total) * 100).toFixed(2)
          }
        })
      }
    
      return result
    })
    
    setHcpsplitSpecialtyData(specialtyData)    
  }

  const processPotentialData = (data) => {
    // Create a Map to track unique HCP IDs for each segment
    const segmentHcpMap = new Map()

    // Process each record
    data.forEach((item) => {
      if (item.hcp_segment && item.rend_npi && item.hcp_segment !== "-" && item.rend_npi !== "-") {
        // Normalize segment name (uppercase for consistency)
        const segment = item.hcp_segment.toUpperCase()

        // Initialize set for this segment if it doesn't exist
        if (!segmentHcpMap.has(segment)) {
          segmentHcpMap.set(segment, new Set())
        }

        // Add HCP ID to the set for this segment
        segmentHcpMap.get(segment).add(item.rend_npi)
      }
    })

    // Map segments to colors and labels
    const colorMap = {
      HIGH: "#B073FE",
      MEDIUM: "#FDBA74",
      LOW: "#B4F06C",
      "V-LOW": "#6EE79A",
      "VERY LOW": "#6EE79A",
    }

    const labelMap = {
      HIGH: "High Potential",
      MEDIUM: "Moderate",
      LOW: "Low Potential",
      "V-LOW": "Very Low Potential",
      "VERY LOW": "Very Low Potential",
    }

    // Convert map to array and format for the chart
    const result = Array.from(segmentHcpMap).map(([segment, hcpSet]) => ({
      label: labelMap[segment] || segment,
      value: hcpSet.size,
      color: colorMap[segment] || "#000000",
    }))

    // Sort by predefined order: High, Moderate, Low, V. Low
    const orderMap = { HIGH: 0, MEDIUM: 1, MODERATE: 1, LOW: 2, "V-LOW": 3, "VERY LOW": 3 }

    result.sort((a, b) => {
      const aSegment = Object.keys(labelMap).find((key) => labelMap[key] === a.label) || ""
      const bSegment = Object.keys(labelMap).find((key) => labelMap[key] === b.label) || ""
      const aOrder = orderMap[aSegment] ?? 999
      const bOrder = orderMap[bSegment] ?? 999
      return aOrder - bOrder
    })

    setPotentialData(result)
  }

  const processTableData = (data) => {
    // Get unique HCPs and count their patients
    const uniqueHcps = {}
    const hcpPatientCounts = {}

    data.forEach((item) => {
      if (item.rend_npi && item.rend_npi !== "-") {
        // Initialize HCP entry if it doesn't exist
        if (!uniqueHcps[item.rend_npi]) {
          uniqueHcps[item.rend_npi] = {
            "HCP ID": item.rend_npi,
            "HCP Name": item.hcp_name,
            Specialty: item.final_spec,
            "Affiliated Accounts": item.hco_mdm_name,
            "HCP Segment": item.hcp_segment,
          }
          hcpPatientCounts[item.rend_npi] = new Set()
        }

        // Add patient to count if it exists
        if (item.patient_id && item.patient_id !== "-") {
          hcpPatientCounts[item.rend_npi].add(item.patient_id)
        }
      }
    })

    // Add patient count to each HCP
    Object.keys(uniqueHcps).forEach((hcpId) => {
      uniqueHcps[hcpId]["Patient Count"] = hcpPatientCounts[hcpId].size
    })

    // Convert to array and add rank
    const tableData = Object.values(uniqueHcps)
      .sort((a, b) => b["Patient Count"] - a["Patient Count"])
      .map((hcp, index) => ({
        Rank: String(index + 1).padStart(2, "0"),
        ...hcp,
      }))

    // Store all table data
    setAllTableData(tableData)

    // Calculate total pages
    const totalPagesCount = Math.ceil(tableData.length / rowsPerPage)
    setTotalPages(totalPagesCount)

    // Update paginated data
    updatePaginatedData(tableData, currentPage, rowsPerPage)
  }

  // Update paginated data based on current page and rows per page
  const updatePaginatedData = (data, page, rowsPerPageCount) => {
    const startIndex = (page - 1) * rowsPerPageCount
    const endIndex = startIndex + rowsPerPageCount
    setTableData(data.slice(startIndex, endIndex))
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

  // Toggle dropdown
  const toggleDropdown = (dropdown) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown)
  }

  // Handle row count change
  const handleRowCountChange = (count) => {
    setRowsPerPage(count)
    setCurrentPage(1) // Reset to first page

    // Update total pages
    const totalPagesCount = Math.ceil(allTableData.length / count)
    setTotalPages(totalPagesCount)

    // Update paginated data
    updatePaginatedData(allTableData, 1, count)
  }

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page)
    updatePaginatedData(allTableData, page, rowsPerPage)
  }

  // Calculate max value for potential data
  const maxValue = potential_data.length > 0 ? Math.max(...potential_data.map((item) => item.value), 0) : 0

  // Navigate to HCP details
  const getHCPDetails = (hcpName) => {
    navigate("/hcp", { state: { hcp_name: hcpName } })
  }

  // Generate pagination range with visible pages
  const getPaginationRange = () => {
    const visiblePages = 5 // Show 5 pages at a time

    let startPage = Math.max(1, currentPage - Math.floor(visiblePages / 2))
    let endPage = startPage + visiblePages - 1

    if (endPage > totalPages) {
      endPage = totalPages
      startPage = Math.max(1, endPage - visiblePages + 1)
    }

    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 w-full p-2">
      {/* Filters */}
      <div className="flex gap-4 items-center">
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

        {/* Brand Filter */}
        <div className="relative">
          <div
            className="flex items-center py-1 px-2 rounded-lg bg-white  justify-between cursor-pointer min-w-[120px]"
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

        {/* Age Filter */}
        <div className="relative">
          <div
            className="flex items-center py-1 px-2 rounded-lg  bg-white justify-between cursor-pointer min-w-[120px]"
            onClick={() => toggleDropdown("age")}
          >
            <span className="text-[12px] text-gray-600">Age: {filters.age}</span>
            <ChevronDown className="w-4 h-4" />
          </div>
          {openDropdown === "age" && (
            <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-md z-10 w-full">
              {filterOptions.ages.map((age) => (
                <div
                  key={age}
                  className={`p-2 text-[12px] hover:bg-gray-100 cursor-pointer ${
                    filters.age === age ? "bg-blue-50 text-blue-600" : ""
                  }`}
                  onClick={() => handleFilterChange("age", age)}
                >
                  {age}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div></div>
      {/* KPI Cards */}
      <div className="flex gap-4 w-full">
        <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[20%] h-20 p-2 justify-between">
          <div className="flex gap-2 items-center">
            <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
              <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
            </div>
            <span className="text-gray-500 text-[11px] font-[500]">Rendering HCPs</span>
          </div>
          <span className="text-gray-700 text-[16px] font-[500] pl-2">{kpiData.renderingHCPs}</span>
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
            </div>
          </div>
        </div>

        <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[20%] h-20 p-2 justify-between">
          <div className="flex gap-2 items-center">
            <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
              <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
            </div>
            <span className="text-gray-500 text-[11px] font-[500]">Avg #Pats Treated per HCPs</span>
          </div>
          <span className="text-gray-700 text-[16px] font-[500] pl-2">{kpiData.avgPatientsPerHCP}</span>
        </div>

        <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[20%] h-20 p-2 justify-between">
          <div className="flex gap-2 items-center">
            <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
              <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
            </div>
            <span className="text-gray-500 text-[11px] font-[500]">#Referring HCPs</span>
          </div>
          <span className="text-gray-700 text-[16px] font-[500] pl-2">{kpiData.referringHCPs}</span>
        </div>

        <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[20%] h-20 p-2 justify-between">
          <div className="flex gap-2 items-center">
            <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
              <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
            </div>
            <span className="text-gray-500 text-[11px] font-[500]">Avg #Pats Referred per HCPs</span>
          </div>
          <span className="text-gray-700 text-[16px] font-[500] pl-2">{kpiData.avgPatientsReferredPerHCP}</span>
        </div>
      </div>

      {/* QoQ Patients By Brand Chart - Full Width */}
      <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-56 p-2">
        <div className="flex gap-2 items-center justify-between w-full pb-4">
          <span className="text-gray-500 text-[11px] font-[500]">#QoQ Patients By Brand</span>
          <div className="flex gap-2 items-center">
            <div className="flex gap-1 items-center">
              <div className="bg-[#8E58B3] rounded-full w-2 h-2"></div>
              <span className="text-[10px] text-gray-600">Zolgensma</span>
            </div>
            <div className="flex gap-1 items-center">
              <div className="bg-[#2A9FB0] rounded-full w-2 h-2"></div>
              <span className="text-[10px] text-gray-600">Spinraza</span>
            </div>
            <div className="flex gap-1 items-center">
              <div className="bg-[#D50057] rounded-full w-2 h-2"></div>
              <span className="text-[10px] text-gray-600">Evrysdi</span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={brandData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
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
            <Tooltip formatter={(value) =>`${value}`} labelStyle={{ fontSize: 11 }}
                itemStyle={{ fontSize: 10 }}/>
            <Bar dataKey="Zolgensma" stackId="a" fill="#8E58B3" />
            <Bar dataKey="Spinraza" stackId="a" fill="#2A9FB0" />
            <Bar dataKey="Evrysdi" stackId="a" fill="#D50057">
              <LabelList dataKey="total" position="top" fontSize={9} fill="#333" fontWeight="15px" offset={5} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Charts - Second Row */}
      <div className="flex gap-4 w-full">
        <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[30%] h-56 p-2">
          <span className="text-gray-500 text-[11px] font-[500] pb-4">HCP segment by SMA patient Potential</span>
          <div className="flex flex-col space-y-3 flex-grow justify-around pr-2">
            {potential_data.map((item, index) => (
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

        <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[30%] h-56 p-2">
          <div className="flex gap-2 items-center justify-between w-full pb-4">
            <span className="text-gray-500 text-[11px] font-[500]">HCP Split by Segment and Age Group</span>
            <div className="flex gap-2 items-center">
              <div className="flex gap-1 items-center">
                <div className="bg-[#2c84b0] rounded-full w-2 h-2"></div>
                <span className="text-[10px] text-gray-600">{"<2"}</span>
              </div>
              <div className="flex gap-1 items-center">
                <div className="bg-[#8295ae] rounded-full w-2 h-2"></div>
                <span className="text-[10px] text-gray-600">{"3-17"}</span>
              </div>
              <div className="flex gap-1 items-center">
                <div className="bg-[#addaf0] rounded-full w-2 h-2"></div>
                <span className="text-[10px] text-gray-600">{">18"}</span>
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height="100%" style={{ marginLeft: -10, marginBottom: -20 }}>
            <BarChart data={hcpsplit_age}>
              <CartesianGrid strokeDasharray="3 3" />
              
              <XAxis dataKey="segment" tick={{ fontSize: 10 }} />
              
              <YAxis
                tick={{ fontSize: 10 }}
                domain={[0, 100]}
                unit="%"
                tickFormatter={(value) => Math.round(value)}
              />
              
              <Tooltip
                formatter={(value) => `${Math.round(value)}%`}
                labelStyle={{ fontSize: 11 }}
                itemStyle={{ fontSize: 10 }}
              />

              <Bar dataKey="<2" stackId="a" fill="#2c84b0">
                <LabelList dataKey="<2" position="insideTop" fontSize={9} fill="#fff" formatter={(val) => `${Math.round(val)}%`} />
              </Bar>
              
              <Bar dataKey="3-17" stackId="a" fill="#8295ae">
                <LabelList dataKey="3-17" position="insideTop" fontSize={9} fill="#fff" formatter={(val) => `${Math.round(val)}%`} />
              </Bar>
              
              <Bar dataKey=">18" stackId="a" fill="#addaf0" radius={[10, 10, 0, 0]}>
                <LabelList dataKey=">18" position="insideTop" fontSize={9} fill="#333" formatter={(val) => `${Math.round(val)}%`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[40%] h-56 p-2">
          <div className="flex gap-4 items-center justify-between w-full pb-4">
            <div>
              <span className="text-gray-500 text-[11px] font-[500] text-wrap">HCP Split by Segment and Specialty</span>
            </div>

            <div className="flex gap-2 items-center flex-wrap justify-end">
              <div className="flex gap-1 items-center">
                <div className="bg-[#2c84b0] rounded-full w-2 h-2"></div>
                <span className="text-[10px] text-gray-600">Pediatric</span>
              </div>
              <div className="flex gap-1 items-center">
                <div className="bg-[#8295ae] rounded-full w-2 h-2"></div>
                <span className="text-[10px] text-gray-600">Child Neurology</span>
              </div>
              <div className="flex gap-1 items-center">
                <div className="bg-[#addaf0] rounded-full w-2 h-2"></div>
                <span className="text-[10px] text-gray-600">Neurology</span>
              </div>
              <div className="flex gap-1 items-center">
                <div className="bg-[#e7caed] rounded-full w-2 h-2"></div>
                <span className="text-[10px] text-gray-600">Neuromuscular</span>
              </div>
              <div className="flex gap-1 items-center">
                <div className="bg-[#bac8f5] rounded-full w-2 h-2"></div>
                <span className="text-[10px] text-gray-600">NP/PA</span>
              </div>
              <div className="flex gap-1 items-center">
                <div className="bg-[#f5d6ba] rounded-full w-2 h-2"></div>
                <span className="text-[10px] text-gray-600">All Others</span>
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height="100%" style={{ marginRight: -10, marginBottom: -20 }}>
  <BarChart data={hcpsplit_specialty_data}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="segment" tick={{ fontSize: 10 }} />
    <YAxis
      tick={{ fontSize: 10 }}
      domain={[0, 100]}
      unit="%"
      tickFormatter={(value) => Math.round(value)}
    />
    <Tooltip
      contentStyle={{ fontSize: 10 }}
      itemStyle={{ fontSize: 10 }}
      formatter={(value) => `${Math.round(value)}%`}
    />

    <Bar dataKey="Pediatric" stackId="a" fill="#2c84b0">
      <LabelList dataKey="Pediatric" position="insideTop" fontSize={9} fill="#fff" formatter={(val) => `${Math.round(val)}%`} />
    </Bar>

    <Bar dataKey="Child Neurology" stackId="a" fill="#8295ae">
      <LabelList dataKey="Child Neurology" position="insideTop" fontSize={9} fill="#fff" formatter={(val) => `${Math.round(val)}%`} />
    </Bar>

    <Bar dataKey="Neurology" stackId="a" fill="#addaf0">
      <LabelList dataKey="Neurology" position="insideTop" fontSize={9} fill="#000" formatter={(val) => `${Math.round(val)}%`} />
    </Bar>

    <Bar dataKey="Neuromuscular" stackId="a" fill="#e7caed">
      <LabelList dataKey="Neuromuscular" position="insideTop" fontSize={9} fill="#000" formatter={(val) => `${Math.round(val)}%`} />
    </Bar>

    <Bar dataKey="NP/PA" stackId="a" fill="#bac8f5">
      <LabelList dataKey="NP/PA" position="insideTop" fontSize={9} fill="#000" formatter={(val) => `${Math.round(val)}%`} />
    </Bar>

    <Bar dataKey="All Others" stackId="a" fill="#f5d6ba" radius={[10, 10, 0, 0]}>
      <LabelList dataKey="All Others" position="insideTop" fontSize={9} fill="#333" formatter={(val) => `${Math.round(val)}%`} />
    </Bar>
  </BarChart>
</ResponsiveContainer>

        </div>
      </div>

      {/* HCPs Table */}
      <div className="flex flex-col bg-white rounded-xl border border-gray-300 w-full shadow-sm">
        <div className="flex justify-between items-center p-2">
          <div className="flex gap-2 items-center">
            <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
              <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
            </div>
            <span className="text-gray-500 text-[11px] font-[500]">HCPs List</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-[11px]">Show rows:</span>
            <select
              className="border border-gray-300 rounded text-[11px] p-1"
              value={rowsPerPage}
              onChange={(e) => handleRowCountChange(Number(e.target.value))}
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
                <th className="p-2 text-left">HCP ID</th>
                <th className="p-2 text-left">HCP Name</th>
                <th className="p-2 text-left">Specialty</th>
                <th className="p-2 text-left">HCP Segment</th>
                <th className="p-2 text-right">Patient Count</th>
                <th className="p-2 text-left">Affiliated Accounts</th>
              </tr>
            </thead>

            <tbody>
              {table_data.map((hcp, index) => (
                <tr key={index} className="border-t text-gray-800 text-[10px]">
                  <td className="p-2">{hcp.Rank}</td>
                  <td onClick={() => getHCPDetails(hcp["HCP Name"])} className="p-2 cursor-pointer">{hcp["HCP ID"]}</td>
                  <td onClick={() => getHCPDetails(hcp["HCP Name"])} className="p-2 cursor-pointer">
                    {hcp["HCP Name"]}
                  </td>
                  <td className="p-2">{hcp.Specialty}</td>
                  <td className="p-2">{hcp["HCP Segment"]}</td>
                  <td className="p-2 text-right">{hcp["Patient Count"]}</td>
                  <td className="p-2">{hcp["Affiliated Accounts"]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination with 5 visible pages */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center py-2 border-t border-gray-200">
            <button
              className="px-2 py-1 text-[10px] text-gray-600 disabled:text-gray-400"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(1)}
            >
              First
            </button>

            <button
              className="px-2 py-1 text-[10px] text-gray-600 disabled:text-gray-400"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              Previous
            </button>

            <div className="flex mx-2">
              {getPaginationRange().map((page) => (
                <button
                  key={page}
                  className={`w-6 h-6 mx-1 rounded-full text-[10px] ${
                    currentPage === page ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
                  }`}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              className="px-2 py-1 text-[10px] text-gray-600 disabled:text-gray-400"
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              Next
            </button>

            <button
              className="px-2 py-1 text-[10px] text-gray-600 disabled:text-gray-400"
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(totalPages)}
            >
              Last
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default HCPlandscape