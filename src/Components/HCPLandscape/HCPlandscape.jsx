"use client"

import { useState, useEffect } from "react"
import { FaUserDoctor } from "react-icons/fa6"
import { ChevronDown } from "lucide-react"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts"
import { useNavigate } from "react-router-dom"

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
  const [quarterPatData, setQuarterPatData] = useState([])
  const [brandData, setBrandData] = useState([])
  const [hcpsplit_age, setHcpsplitAge] = useState([])
  const [hcpsplit_specialty_data, setHcpsplitSpecialtyData] = useState([])
  const [potential_data, setPotentialData] = useState([])
  const [table_data, setTableData] = useState([])
  const [allTableData, setAllTableData] = useState([])
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [filters, setFilters] = useState({
    year: "2024", // Default year, will be updated with most recent year
    brand: "All",
    age: "All",
  })

  // Filter options
  const [filterOptions, setFilterOptions] = useState({
    years: [],
    brands: ["All"],
    ages: ["All"],
  })

  // Dropdown state
  const [openDropdown, setOpenDropdown] = useState(null)

  // Fetch available years on component mount
  useEffect(() => {
    const fetchAvailableYears = async () => {
      try {
        setIsLoading(true)
        // Fetch data without year filter to get all records
        const response = await fetch("http://127.0.0.1:5000/fetch-hcplandscape")
        const jsonData = await response.json()

        // Extract unique years from the data
        const years = [...new Set(jsonData.map((item) => item.year))]
          .filter((year) => year && year !== "-")
          .sort((a, b) => b - a)

        // Update filter options with available years
        setFilterOptions((prev) => ({
          ...prev,
          years: years.length > 0 ? years : ["2024"], 
        }))

        // Set default year to the most recent year
        if (years.length > 0) {
          const mostRecentYear = years[0];
          setFilters((prev) => ({
            ...prev,
            year: mostRecentYear,
          }))
        }

        // Process initial data if we have it
        if (jsonData.length > 0) {
          // Filter data for the selected year
          const yearData = jsonData.filter((item) => item.year === filters.year)
          if (yearData.length > 0) {
            setData(yearData)
            extractFilterOptions(yearData)
            processData(yearData)
          } else {
            // If no data for selected year, fetch it specifically
            fetchData()
          }
        } else {
          fetchData()
        }
      } catch (error) {
        console.error("Error fetching available years:", error)
        // Fallback to default years if there's an error
        setFilterOptions((prev) => ({
          ...prev,
          years: ["2024", "2025"],
        }))
        fetchData()
      }
    }

    fetchAvailableYears()
  }, []) // Empty dependency array ensures this runs only once on component mount

  // Fetch data when filters change
  useEffect(() => {
    if (filterOptions.years.length > 0) {
      fetchData()
    }
  }, [filters])

  const fetchData = async () => {
    try {
      setIsLoading(true)

      // Build query string based on filters
      let queryString = `?year=${filters.year}`
      if (filters.brand !== "All") {
        queryString += `&brand=${filters.brand}`
      }
      if (filters.age !== "All") {
        queryString += `&age=${filters.age}`
      }

      const response = await fetch(`http://127.0.0.1:5000/fetch-hcplandscape${queryString}`)
      const jsonData = await response.json()

      setData(jsonData)

      // Extract filter options from data
      if (filters.brand === "All" && filters.age === "All") {
        extractFilterOptions(jsonData)
      }

      // Process data for different visualizations
      processData(jsonData)

      setIsLoading(false)
    } catch (error) {
      console.error("Error fetching data:", error)
      setIsLoading(false)
    }
  }

  const extractFilterOptions = (data) => {
    // Extract unique brands and age groups
    const brands = ["All", ...new Set(data.map((item) => item.drug_name).filter((brand) => brand && brand !== "-"))]
    const ages = ["All", ...new Set(data.map((item) => item.age_group).filter((age) => age && age !== "-"))]

    setFilterOptions((prev) => ({
      ...prev, // Keep the years that were already fetched
      brands,
      ages,
    }))
  }

  const processData = (data) => {
    // Calculate KPI metrics
    calculateKPIMetrics(data)

    // Process quarterly patient data
    processQuarterlyData(data)

    // Process brand data
    processBrandData(data)

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

  const processQuarterlyData = (data) => {
    // Group patients by quarter
    const quarterCounts = {}

    data.forEach((item) => {
      if (item.quarter && item.patient_id && item.patient_id !== "-") {
        const quarter = Number.parseInt(item.quarter)
        if (!quarterCounts[quarter]) {
          quarterCounts[quarter] = new Set()
        }
        quarterCounts[quarter].add(item.patient_id)
      }
    })

    // Format for chart
    const formattedQuarterData = Object.entries(quarterCounts)
      .map(([quarter, patients]) => ({
        quarter: `Q${quarter} ${filters.year}`,
        value: patients.size,
      }))
      .sort((a, b) => {
        const quarterA = Number.parseInt(a.quarter.substring(1, 2))
        const quarterB = Number.parseInt(b.quarter.substring(1, 2))
        return quarterA - quarterB
      })

    setQuarterPatData(formattedQuarterData)
  }

  const processBrandData = (data) => {
    // Group patients by quarter and drug
    const brandQuarterCounts = {}

    data.forEach((item) => {
      if (item.quarter && item.drug_name && item.drug_name !== "-" && item.patient_id && item.patient_id !== "-") {
        const quarter = Number.parseInt(item.quarter)
        if (!brandQuarterCounts[quarter]) {
          brandQuarterCounts[quarter] = {
            ZOLGENSMA: new Set(),
            SPINRAZA: new Set(),
            EVRYSDI: new Set(),
          }
        }

        if (brandQuarterCounts[quarter][item.drug_name]) {
          brandQuarterCounts[quarter][item.drug_name].add(item.patient_id)
        }
      }
    })

    // Format for chart
    const formattedBrandData = Object.entries(brandQuarterCounts)
      .map(([quarter, brands]) => ({
        quarter: `${filters.year} Q${quarter}`,
        Zolgensma: brands.ZOLGENSMA ? brands.ZOLGENSMA.size : 0,
        Spinraza: brands.SPINRAZA ? brands.SPINRAZA.size : 0,
        Evrysdi: brands.EVRYSDI ? brands.EVRYSDI.size : 0,
      }))
      .sort((a, b) => {
        const quarterA = Number.parseInt(a.quarter.substring(a.quarter.length - 1))
        const quarterB = Number.parseInt(b.quarter.substring(b.quarter.length - 1))
        return quarterA - quarterB
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

      segmentSpecialtyHcpMap.forEach((hcps, key) => {
        if (key.startsWith(`${segment}_`)) {
          const specialty = key.substring(segment.length + 1)
          if (!Object.keys(specialtyCategories).includes(specialty)) {
            result["All Others"] += hcps.size
          }
        }
      })

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

    setAllTableData(tableData)
    setTableData(tableData.slice(0, rowsPerPage))
  }

  // Handle filter changes
  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: value,
    }))

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
    setTableData(allTableData.slice(0, count))
  }

  // Calculate max value for potential data
  const maxValue = potential_data.length > 0 ? Math.max(...potential_data.map((item) => item.value), 0) : 0

  // Navigate to HCP details
  const getHCPDetails = (hcpName) => {
    navigate("/hcp", { state: { hcp_name: hcpName } })
  }

  useEffect(() => {
    setTableData(allTableData.slice(0, rowsPerPage))
  }, [rowsPerPage, allTableData])

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

        {/* Age Filter */}
        <div className="relative">
          <div
            className="flex items-center py-1 px-2 rounded-lg bg-white justify-between cursor-pointer min-w-[120px]"
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

      {/* Charts - First Row */}
      <div className="flex gap-4 w-full">
        <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[60%] h-56 p-2">
          <span className="text-gray-500 text-[11px] font-[500] pb-4">#QoQ SMA Treated Patients (12 months)</span>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={quarterPatData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="quarter" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#2962FF" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[40%] h-56 p-2">
          <div className="flex gap-2 items-center justify-between w-full pb-4">
            <span className="text-gray-500 text-[11px] font-[500]">#QoQ Patients By Brand</span>
            <div className="flex gap-2 items-center">
              <div className="flex gap-1 items-center">
                <div className="bg-[#004567] rounded-full w-2 h-2"></div>
                <span className="text-[10px] text-gray-600">Zolgensma</span>
              </div>
              <div className="flex gap-1 items-center">
                <div className="bg-[#8295ae] rounded-full w-2 h-2"></div>
                <span className="text-[10px] text-gray-600">Spinraza</span>
              </div>
              <div className="flex gap-1 items-center">
                <div className="bg-[#5aa687] rounded-full w-2 h-2"></div>
                <span className="text-[10px] text-gray-600">Evrysdi</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height="90%" style={{ marginLeft: -10, marginBottom: -20 }}>
            <BarChart data={brandData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="quarter" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />

              <Bar dataKey="Zolgensma" stackId="a" fill="#004567" />
              <Bar dataKey="Spinraza" stackId="a" fill="#8295ae" />
              <Bar dataKey="Evrysdi" stackId="a" fill="#5aa687" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
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
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />

              <Bar dataKey="<2" stackId="a" fill="#2c84b0" />
              <Bar dataKey="3-17" stackId="a" fill="#8295ae" />
              <Bar dataKey=">18" stackId="a" fill="#addaf0" radius={[10, 10, 0, 0]} />
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
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 10 }} itemStyle={{ fontSize: 10 }} />

              <Bar dataKey="Pediatric" stackId="a" fill="#2c84b0" />
              <Bar dataKey="Child Neurology" stackId="a" fill="#8295ae" />
              <Bar dataKey="Neurology" stackId="a" fill="#addaf0" />
              <Bar dataKey="Neuromuscular" stackId="a" fill="#e7caed" />
              <Bar dataKey="NP/PA" stackId="a" fill="#bac8f5" />
              <Bar dataKey="All Others" stackId="a" fill="#f5d6ba" radius={[10, 10, 0, 0]} />
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
                  <td className="p-2">{hcp["HCP ID"]}</td>
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
      </div>
    </div>
  )
}

export default HCPlandscape