"use client"

import { useState, useEffect } from "react"
import { FaUserDoctor } from "react-icons/fa6"
import { ChevronDown, X } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, LabelList,Legend } from "recharts"
import { useNavigate } from "react-router-dom"
import api from "../api/api"

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
    years: [], // Changed to array for multi-select
    brands: [], // Changed to array for multi-select
    ages: [], // Changed to array for multi-select
    states: [], // Added state filter
    selectedQuarter: null, // For quarter filtering
    selectedYear: null, // For year filtering
    segment: null, // For segment filtering
    selectedDrug: null, // For individual drug filtering
    selectedAgeGroup: null, // For individual age group filtering
    selectedSpecialty: null, // For individual specialty filtering
    selectedPotentialDrug: null, // For individual drug in potential chart
  })

  // Filter options
  const [filterOptions, setFilterOptions] = useState({
    years: [],
    brands: [],
    ages: [],
    states: [], // Added state options
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
          years: years,
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
      // Year filter - check if any selected years match or if no years are selected
      if (filters.years.length > 0 && !filters.years.includes(item.year)) return false

      // Brand filter - check if any selected brands match or if no brands are selected
      if (filters.brands.length > 0 && !filters.brands.includes(item.drug_name)) return false

      // Age filter - check if any selected ages match or if no ages are selected
      if (filters.ages.length > 0 && !filters.ages.includes(item.age_group)) return false

      // State filter - check if any selected states match either hcp_state or ref_hcp_state
      if (filters.states.length > 0) {
        const hcpState = item.hcp_state || ""
        const refHcpState = item.ref_hcp_state || ""

        // If neither state matches any of the selected states, filter out this item
        if (!filters.states.some((state) => state === hcpState || state === refHcpState)) {
          return false
        }
      }

      // Quarter and Year filter
      if (filters.selectedQuarter !== null && filters.selectedYear !== null) {
        // Convert to string for comparison since API data might have string values
        const itemYear = String(item.year)
        const itemQuarter = String(item.quarter)
        const filterYear = String(filters.selectedYear)
        const filterQuarter = String(filters.selectedQuarter)

        if (itemYear !== filterYear || itemQuarter !== filterQuarter) {
          return false
        }
      }

      // Individual drug filter for specific quarter-year combination
      if (filters.selectedDrug !== null && filters.selectedQuarter !== null && filters.selectedYear !== null) {
        // Convert to string for comparison since API data might have string values
        const itemYear = String(item.year)
        const itemQuarter = String(item.quarter)
        const filterYear = String(filters.selectedYear)
        const filterQuarter = String(filters.selectedQuarter)

        if (itemYear !== filterYear || itemQuarter !== filterQuarter || item.drug_name !== filters.selectedDrug) {
          return false
        }
      }

      // Segment filter
      if (filters.segment && item.hcp_segment !== filters.segment) return false

      // Age group filter
      if (filters.selectedAgeGroup) {
        const ageMapping = {
          "<2": "0 to 2",
          "3-17": "3 to 17",
          ">18": "Above 18",
        }

        if (item.age_group !== ageMapping[filters.selectedAgeGroup]) return false
      }

      // Specialty filter
      if (filters.selectedSpecialty) {
        const specialtyMapping = {
          "Child Neurology": "CHILD NEUROLOGY",
          Neurology: "NEUROLOGY",
          Neuromuscular: "NEUROMUSCULAR",
          Pediatric: "PEDIATRIC",
          Radiology: "RADIOLOGY",
          "NP/PA": "NP/PA",
        }

        const apiSpecialty = specialtyMapping[filters.selectedSpecialty]
        if (!apiSpecialty) {
          // Handle "All Others" case
          if (filters.selectedSpecialty === "All Others") {
            const mainSpecialties = Object.values(specialtyMapping)
            if (mainSpecialties.includes(item.final_spec?.toUpperCase())) return false
          } else {
            return false
          }
        } else if (item.final_spec?.toUpperCase() !== apiSpecialty) {
          return false
        }
      }

      // Potential drug filter
      if (filters.selectedPotentialDrug && item.drug_name !== filters.selectedPotentialDrug) {
        return false
      }

      return true
    })
  }

  const extractFilterOptions = (data) => {
    // Extract unique brands and age groups
    const brands = [...new Set(data.map((item) => item.drug_name).filter((brand) => brand && brand !== "-"))]
    const ages = [...new Set(data.map((item) => item.age_group).filter((age) => age && age !== "-"))]

    // Get years but filter out 2016 and 2025
    const years = [...new Set(data.map((item) => item.year))]
      .filter((year) => year && year !== "-" && year !== "2016" && year !== "2025")
      .sort((a, b) => b - a) // Sort years in descending order

    // Extract unique states from both hcp_state and ref_hcp_state
    const hcpStates = new Set(data.map((item) => item.hcp_state).filter((state) => state && state !== "-"))
    const refHcpStates = new Set(data.map((item) => item.ref_hcp_state).filter((state) => state && state !== "-"))
    const allStates = [...hcpStates, ...refHcpStates]
    const uniqueStates = [...new Set(allStates)].sort()

    setFilterOptions((prev) => ({
      ...prev,
      years: years,
      brands,
      ages,
      states: uniqueStates,
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
    processPotentialData(data)
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
    let ageGroupData = segments.map((segment) => {
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

    // Sort segments in the correct order: HIGH, MEDIUM, LOW, V-LOW
    const segmentOrder = { HIGH: 0, MEDIUM: 1, LOW: 2, "V-LOW": 3 }

    ageGroupData = ageGroupData.sort((a, b) => {
      const orderA = segmentOrder[a.segment] !== undefined ? segmentOrder[a.segment] : 999
      const orderB = segmentOrder[b.segment] !== undefined ? segmentOrder[b.segment] : 999
      return orderA - orderB
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
    let specialtyData = segments.map((segment) => {
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
        result["Radiology"] +
        result["All Others"]

      result.total = total

      // Convert to percentage for 100% stacked chart
      if (total > 0) {
        Object.keys(result).forEach((key) => {
          if (key !== "segment" && key !== "total") {
            result[key] = Number.parseFloat(((result[key] / total) * 100).toFixed(2))
          }
        })
      }

      return result
    })

    // Sort segments in the correct order: HIGH, MEDIUM, LOW, V-LOW
    const segmentOrder = { HIGH: 0, MEDIUM: 1, LOW: 2, "V-LOW": 3 }

    specialtyData = specialtyData.sort((a, b) => {
      const orderA = segmentOrder[a.segment] !== undefined ? segmentOrder[a.segment] : 999
      const orderB = segmentOrder[b.segment] !== undefined ? segmentOrder[b.segment] : 999
      return orderA - orderB
    })

    setHcpsplitSpecialtyData(specialtyData)
  }

  const processPotentialData = (data) => {
    // Create a Map to track unique HCP IDs for each segment and drug
    const segmentDrugPatientMap = new Map()

    // Process each record
    data.forEach((item) => {
      if (
        item.hcp_segment &&
        item.drug_name &&
        item.patient_id &&
        item.hcp_segment !== "-" &&
        item.drug_name !== "-" &&
        item.patient_id !== "-"
      ) {
        // Normalize segment name (uppercase for consistency)
        const segment = item.hcp_segment.toUpperCase()
        const drug = item.drug_name

        // Create key for segment-drug combination
        const key = `${segment}_${drug}`

        // Initialize set for this segment-drug if it doesn't exist
        if (!segmentDrugPatientMap.has(key)) {
          segmentDrugPatientMap.set(key, new Set())
        }

        // Add patient ID to the set for this segment-drug
        segmentDrugPatientMap.get(key).add(item.patient_id)
      }
    })

    // Get unique segments
    const segments = [...new Set(data.map((item) => item.hcp_segment).filter((s) => s && s !== "-"))]

    // Sort segments in the correct order: HIGH, MEDIUM, LOW, V-LOW
    const segmentOrder = { HIGH: 0, MEDIUM: 1, LOW: 2, "V-LOW": 3, "VERY LOW": 3 }

    const sortedSegments = segments.sort((a, b) => {
      const orderA = segmentOrder[a] !== undefined ? segmentOrder[a] : 999
      const orderB = segmentOrder[b] !== undefined ? segmentOrder[b] : 999
      return orderA - orderB
    })

    // Format data for stacked bar chart
    const formattedData = sortedSegments.map((segment) => {
      const result = { segment }

      // Count patients for each drug in this segment
      result.Zolgensma = segmentDrugPatientMap.get(`${segment}_ZOLGENSMA`)?.size || 0
      result.Spinraza = segmentDrugPatientMap.get(`${segment}_SPINRAZA`)?.size || 0
      result.Evrysdi = segmentDrugPatientMap.get(`${segment}_EVRYSDI`)?.size || 0

      // Calculate total
      result.total = result.Zolgensma + result.Spinraza + result.Evrysdi

      return result
    })

    setPotentialData(formattedData)
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
            State: item.hcp_state || "-", // Add state information
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

  // Handle filter changes for multi-select
  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => {
      const newFilters = { ...prev }

      // Handle multi-select filters (years, brands, ages, states)
      if (filterName === "years" || filterName === "brands" || filterName === "ages" || filterName === "states") {
        const currentValues = [...prev[filterName]]
        const valueIndex = currentValues.indexOf(value)

        if (valueIndex === -1) {
          // Add value if not present
          currentValues.push(value)
        } else {
          // Remove value if already present
          currentValues.splice(valueIndex, 1)
        }

        newFilters[filterName] = currentValues
      } else {
        // Handle single-select filters
        newFilters[filterName] = value
      }

      return newFilters
    })

    // Reset to first page when filters change
    setCurrentPage(1)
  }

  // Handle individual bar click for QoQ Patients By Brand chart
  const handleIndividualBarClick = (data, dataKey) => {
    // Extract year and quarter from the clicked bar
    const year = data.year
    const quarterMatch = data.quarter.match(/Q(\d+)/)
    const quarter = quarterMatch ? quarterMatch[1] : null

    // Map dataKey to actual drug name in the database
    const drugMap = {
      Zolgensma: "ZOLGENSMA",
      Spinraza: "SPINRAZA",
      Evrysdi: "EVRYSDI",
    }

    const drugName = drugMap[dataKey]

    if (year && quarter && drugName) {
      // Check if we're already filtering by this exact combination
      if (filters.selectedYear === year && filters.selectedQuarter === quarter && filters.selectedDrug === drugName) {
        // Clear the filters if clicking the same bar again
        setFilters((prev) => ({
          ...prev,
          selectedYear: null,
          selectedQuarter: null,
          selectedDrug: null,
        }))
      } else {
        // Set the filters for this specific drug and quarter-year combination
        setFilters((prev) => ({
          ...prev,
          selectedYear: year,
          selectedQuarter: quarter,
          selectedDrug: drugName,
        }))
      }
    }
  }

  // Handle individual bar click for Potential chart
  const handlePotentialBarClick = (data, dataKey) => {
    // Map dataKey to actual drug name in the database
    const drugMap = {
      Zolgensma: "ZOLGENSMA",
      Spinraza: "SPINRAZA",
      Evrysdi: "EVRYSDI",
    }

    const drugName = drugMap[dataKey]
    const segment = data.segment

    if (segment && drugName) {
      // Check if we're already filtering by this exact combination
      if (filters.segment === segment && filters.selectedPotentialDrug === drugName) {
        // Clear the filters if clicking the same bar again
        setFilters((prev) => ({
          ...prev,
          segment: null,
          selectedPotentialDrug: null,
        }))
      } else {
        // Set the filters for this specific drug and segment combination
        setFilters((prev) => ({
          ...prev,
          segment: segment,
          selectedPotentialDrug: drugName,
        }))
      }
    }
  }

  // Handle individual bar click for Age Group chart
  const handleAgeGroupBarClick = (data, dataKey) => {
    const segment = data.segment
    const ageGroup = dataKey // "<2", "3-17", or ">18"

    if (segment && ageGroup) {
      // Check if we're already filtering by this exact combination
      if (filters.segment === segment && filters.selectedAgeGroup === ageGroup) {
        // Clear the filters if clicking the same bar again
        setFilters((prev) => ({
          ...prev,
          segment: null,
          selectedAgeGroup: null,
        }))
      } else {
        // Set the filters for this specific age group and segment combination
        setFilters((prev) => ({
          ...prev,
          segment: segment,
          selectedAgeGroup: ageGroup,
        }))
      }
    }
  }

  // Handle individual bar click for Specialty chart
  const handleSpecialtyBarClick = (data, dataKey) => {
    const segment = data.segment
    const specialty = dataKey // "Child Neurology", "Neurology", etc.

    if (segment && specialty) {
      // Check if we're already filtering by this exact combination
      if (filters.segment === segment && filters.selectedSpecialty === specialty) {
        // Clear the filters if clicking the same bar again
        setFilters((prev) => ({
          ...prev,
          segment: null,
          selectedSpecialty: null,
        }))
      } else {
        // Set the filters for this specific specialty and segment combination
        setFilters((prev) => ({
          ...prev,
          segment: segment,
          selectedSpecialty: specialty,
        }))
      }
    }
  }

  // Handle bar click for segment charts
  const handleSegmentBarClick = (data) => {
    // Filter by segment
    setFilters((prev) => ({
      ...prev,
      segment: data.segment,
    }))
  }

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      years: [],
      brands: [],
      ages: [],
      states: [],
      selectedQuarter: null,
      selectedYear: null,
      segment: null,
      selectedDrug: null,
      selectedAgeGroup: null,
      selectedSpecialty: null,
      selectedPotentialDrug: null,
    })
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

  // Check if any filters are active
  const hasActiveFilters = () => {
    return (
      filters.years.length > 0 ||
      filters.brands.length > 0 ||
      filters.ages.length > 0 ||
      filters.states.length > 0 ||
      filters.selectedQuarter !== null ||
      filters.segment !== null ||
      filters.selectedDrug !== null ||
      filters.selectedAgeGroup !== null ||
      filters.selectedSpecialty !== null ||
      filters.selectedPotentialDrug !== null
    )
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
      {/* Filters and Clear Button */}
      <div className="flex justify-between items-center">
        <div className="flex gap-4 items-center flex-wrap">
          {/* State Filter - Added new filter */}
          <div className="relative">
            <div
              className="flex items-center py-1 px-2 rounded-lg bg-white justify-between cursor-pointer min-w-[120px]"
              onClick={() => toggleDropdown("state")}
            >
              <span className="text-[12px] text-gray-600">
                State: {filters.states.length > 0 ? filters.states.join(", ") : "All"}
              </span>
              <ChevronDown className="w-4 h-4" />
            </div>
            {openDropdown === "state" && (
              <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-md z-10 w-full max-h-40 overflow-y-auto">
                {filterOptions.states.map((state) => (
                  <div
                    key={state}
                    className="flex items-center p-2 text-[12px] hover:bg-gray-100 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleFilterChange("states", state)
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={filters.states.includes(state)}
                      onChange={() => {}}
                      className="mr-2"
                    />
                    {state}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Year Filter */}
          <div className="relative">
            <div
              className="flex items-center py-1 px-2 rounded-lg bg-white justify-between cursor-pointer min-w-[100px]"
              onClick={() => toggleDropdown("year")}
            >
              <span className="text-[12px] text-gray-600">
                Year: {filters.years.length > 0 ? filters.years.join(", ") : "All"}
              </span>
              <ChevronDown className="w-4 h-4" />
            </div>
            {openDropdown === "year" && (
              <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-md z-10 w-full max-h-40 overflow-y-auto">
                {filterOptions.years.map((year) => (
                  <div
                    key={year}
                    className="flex items-center p-2 text-[12px] hover:bg-gray-100 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleFilterChange("years", year)
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={filters.years.includes(year)}
                      onChange={() => {}}
                      className="mr-2"
                    />
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
              <span className="text-[12px] text-gray-600">
                Brand: {filters.brands.length > 0 ? filters.brands.join(", ") : "All"}
              </span>
              <ChevronDown className="w-4 h-4" />
            </div>
            {openDropdown === "brand" && (
              <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-md z-10 w-full max-h-40 overflow-y-auto">
                {filterOptions.brands.map((brand) => (
                  <div
                    key={brand}
                    className="flex items-center p-2 text-[12px] hover:bg-gray-100 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleFilterChange("brands", brand)
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={filters.brands.includes(brand)}
                      onChange={() => {}}
                      className="mr-2"
                    />
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
              <span className="text-[12px] text-gray-600">
                Age: {filters.ages.length > 0 ? filters.ages.join(", ") : "All"}
              </span>
              <ChevronDown className="w-4 h-4" />
            </div>
            {openDropdown === "age" && (
              <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-md z-10 w-full max-h-40 overflow-y-auto">
                {filterOptions.ages.map((age) => (
                  <div
                    key={age}
                    className="flex items-center p-2 text-[12px] hover:bg-gray-100 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleFilterChange("ages", age)
                    }}
                  >
                    <input type="checkbox" checked={filters.ages.includes(age)} onChange={() => {}} className="mr-2" />
                    {age}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Filters Display */}
          {filters.states.length > 0 && (
            <div className="flex items-center bg-blue-100 text-blue-800 rounded-lg px-2 py-1 text-[11px]">
              States: {filters.states.join(", ")}
              <button
                onClick={() => setFilters((prev) => ({ ...prev, states: [] }))}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {filters.selectedQuarter !== null && filters.selectedYear !== null && (
            <div className="flex items-center bg-blue-100 text-blue-800 rounded-lg px-2 py-1 text-[11px]">
              Quarter: {filters.selectedYear}-Q{filters.selectedQuarter}
              {filters.selectedDrug && ` (${filters.selectedDrug})`}
              <button
                onClick={() =>
                  setFilters((prev) => ({ ...prev, selectedQuarter: null, selectedYear: null, selectedDrug: null }))
                }
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {filters.segment && (
            <div className="flex items-center bg-blue-100 text-blue-800 rounded-lg px-2 py-1 text-[11px]">
              Segment: {filters.segment}
              {filters.selectedAgeGroup && ` (Age: ${filters.selectedAgeGroup})`}
              {filters.selectedSpecialty && ` (Specialty: ${filters.selectedSpecialty})`}
              {filters.selectedPotentialDrug && ` (Drug: ${filters.selectedPotentialDrug})`}
              <button
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    segment: null,
                    selectedAgeGroup: null,
                    selectedSpecialty: null,
                    selectedPotentialDrug: null,
                  }))
                }
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Clear All Filters Button */}
        {hasActiveFilters() && (
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1 text-[12px] text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg"
          >
            <X size={14} />
            Clear Filters
          </button>
        )}
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
          <span className="text-gray-700 text-[16px] font-[500] pl-2">{kpiData.renderingHCPs.toLocaleString()}</span>
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
              <span className="text-gray-700 text-[16px] font-[500]">{kpiData.patientsLast12M.toLocaleString()}</span>
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
          <span className="text-gray-700 text-[16px] font-[500] pl-2">
            {kpiData.avgPatientsPerHCP.toLocaleString()}
          </span>
        </div>

        <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[20%] h-20 p-2 justify-between">
          <div className="flex gap-2 items-center">
            <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
              <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
            </div>
            <span className="text-gray-500 text-[11px] font-[500]">#Referring HCPs</span>
          </div>
          <span className="text-gray-700 text-[16px] font-[500] pl-2">{kpiData.referringHCPs.toLocaleString()}</span>
        </div>

        <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[20%] h-20 p-2 justify-between">
          <div className="flex gap-2 items-center">
            <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
              <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
            </div>
            <span className="text-gray-500 text-[11px] font-[500]">Avg #Pats Referred per HCPs</span>
          </div>
          <span className="text-gray-700 text-[16px] font-[500] pl-2">
            {kpiData.avgPatientsReferredPerHCP.toLocaleString()}
          </span>
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
          <BarChart data={brandData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }} barSize={30}>
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
            <Tooltip formatter={(value) => `${value}`} labelStyle={{ fontSize: 11 }} itemStyle={{ fontSize: 10 }} />
            <Bar
              dataKey="Zolgensma"
              stackId="a"
              fill={filters.selectedDrug === "ZOLGENSMA" ? "#6a3d81" : "#8E58B3"}
              onClick={(data) => handleIndividualBarClick(data, "Zolgensma")}
              cursor="pointer"
            />
            <Bar
              dataKey="Spinraza"
              stackId="a"
              fill={filters.selectedDrug === "SPINRAZA" ? "#1c6f7c" : "#2A9FB0"}
              onClick={(data) => handleIndividualBarClick(data, "Spinraza")}
              cursor="pointer"
            />
            <Bar
              dataKey="Evrysdi"
              stackId="a"
              fill={filters.selectedDrug === "EVRYSDI" ? "#9c003f" : "#D50057"}
              onClick={(data) => handleIndividualBarClick(data, "Evrysdi")}
              cursor="pointer"
            >
              <LabelList dataKey="total" position="top" fontSize={9} fill="#333" fontWeight="15px" offset={5} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Charts - Second Row */}
      <div className="flex gap-4 w-full">
        <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[25%] h-72 p-2">
          <span className="text-gray-500 text-[11px] font-[500] pb-4">
            Prescriber Cluster by Treated Patient Volume
          </span>
          <div className="flex-grow">
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={potential_data} margin={{ top: 10, right: 30, left: -20, bottom: 40 }} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="segment" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => `${value}`} labelStyle={{ fontSize: 11 }} itemStyle={{ fontSize: 10 }} />
                <Legend  iconType="circle" iconSize={8}  wrapperStyle={{ fontSize: '9px' }} verticalAlign="bottom" align="center" />
                <Bar
                  dataKey="Zolgensma"
                  stackId="a"
                  fill={filters.selectedPotentialDrug === "ZOLGENSMA" ? "#6a3d81" : "#8E58B3"}
                  onClick={(data) => handlePotentialBarClick(data, "Zolgensma")}
                  cursor="pointer"
                />
                <Bar
                  dataKey="Spinraza"
                  stackId="a"
                  fill={filters.selectedPotentialDrug === "SPINRAZA" ? "#1c6f7c" : "#2A9FB0"}
                  onClick={(data) => handlePotentialBarClick(data, "Spinraza")}
                  cursor="pointer"
                />
                <Bar
                  dataKey="Evrysdi"
                  stackId="a"
                  fill={filters.selectedPotentialDrug === "EVRYSDI" ? "#9c003f" : "#D50057"}
                  onClick={(data) => handlePotentialBarClick(data, "Evrysdi")}
                  cursor="pointer"
                >
                  <LabelList dataKey="total" position="top" fontSize={9} fill="#333" fontWeight="15px" offset={5} />
                </Bar>
              </BarChart>
            
            </ResponsiveContainer>
            <div className="flex gap-2 items-center justify-center p-2">
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
        </div>

        <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[30%] h-72 p-2">
          <div className="flex gap-2 items-center justify-between w-full pb-4">
            <span className="text-gray-500 text-[11px] font-[500]">HCP Split by Segment and Age Group</span>
          </div>

          <ResponsiveContainer width="100%" height="100%" style={{ marginLeft: -10, marginBottom: -20 }}>
            <BarChart data={hcpsplit_age} barSize={50}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="segment" tick={{ fontSize: 10 }} />

              <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" tickFormatter={(value) => Math.round(value)} />

              <Tooltip
                formatter={(value) => `${Math.round(value)}%`}
                labelStyle={{ fontSize: 11 }}
                itemStyle={{ fontSize: 10 }}
              />

              <Bar
                dataKey="<2"
                stackId="a"
                fill={filters.selectedAgeGroup === "<2" ? "#1a5a7c" : "#2c84b0"}
                onClick={(data) => handleAgeGroupBarClick(data, "<2")}
                cursor="pointer"
              >
                <LabelList
                  dataKey="<2"
                  position="insideTop"
                  fontSize={9}
                  fill="#fff"
                  formatter={(val) => `${Math.round(val)}%`}
                />
              </Bar>

              <Bar
                dataKey="3-17"
                stackId="a"
                fill={filters.selectedAgeGroup === "3-17" ? "#5a6a7c" : "#8295ae"}
                onClick={(data) => handleAgeGroupBarClick(data, "3-17")}
                cursor="pointer"
              >
                <LabelList
                  dataKey="3-17"
                  position="insideTop"
                  fontSize={9}
                  fill="#fff"
                  formatter={(val) => `${Math.round(val)}%`}
                />
              </Bar>

              <Bar
                dataKey=">18"
                stackId="a"
                fill={filters.selectedAgeGroup === ">18" ? "#7a9ab0" : "#addaf0"}
                radius={[10, 10, 0, 0]}
                onClick={(data) => handleAgeGroupBarClick(data, ">18")}
                cursor="pointer"
              >
                <LabelList
                  dataKey=">18"
                  position="insideTop"
                  fontSize={9}
                  fill={filters.selectedAgeGroup === ">18" ? "#fff" : "#333"}
                  formatter={(val) => `${Math.round(val)}%`}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-2 items-center justify-center p-2">
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

        <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[45%] h-72 p-2">
          <div className="flex gap-4 items-center justify-between w-full pb-4">
            <div>
              <span className="text-gray-500 text-[11px] font-[500] text-wrap">HCP Split by Segment and Specialty</span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height="80%" style={{ marginRight: -10, marginBottom: -20 }}>
            <BarChart data={hcpsplit_specialty_data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }} barSize={60}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="segment" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" tickFormatter={(value) => Math.round(value)} />
              <Tooltip
                contentStyle={{ fontSize: 10 }}
                itemStyle={{ fontSize: 10 }}
                formatter={(value) => `${Math.round(value)}%`}
              />

              <Bar
                dataKey="Child Neurology"
                stackId="a"
                fill={filters.selectedSpecialty === "Child Neurology" ? "#3a4a5a" : "#5d708a"}
                onClick={(data) => handleSpecialtyBarClick(data, "Child Neurology")}
                cursor="pointer"
              >
                <LabelList
                  dataKey="Child Neurology"
                  position="insideTop"
                  fontSize={9}
                  fill="#fff"
                  formatter={(val) => `${Math.round(val)}%`}
                />
              </Bar>
              <Bar
                dataKey="Neurology"
                stackId="a"
                fill={filters.selectedSpecialty === "Neurology" ? "#5a8a9c" : "#7cb1cc"}
                onClick={(data) => handleSpecialtyBarClick(data, "Neurology")}
                cursor="pointer"
              >
                <LabelList
                  dataKey="Neurology"
                  position="insideTop"
                  fontSize={9}
                  fill="#fff"
                  formatter={(val) => `${Math.round(val)}%`}
                />
              </Bar>
              <Bar
                dataKey="Neuromuscular"
                stackId="a"
                fill={filters.selectedSpecialty === "Neuromuscular" ? "#9a6a9a" : "#c39ac9"}
                onClick={(data) => handleSpecialtyBarClick(data, "Neuromuscular")}
                cursor="pointer"
              >
                <LabelList
                  dataKey="Neuromuscular"
                  position="insideTop"
                  fontSize={9}
                  fill="#fff"
                  formatter={(val) => `${Math.round(val)}%`}
                />
              </Bar>
              <Bar
                dataKey="Pediatric"
                stackId="a"
                fill={filters.selectedSpecialty === "Pediatric" ? "#0a3a5a" : "#1f5f86"}
                onClick={(data) => handleSpecialtyBarClick(data, "Pediatric")}
                cursor="pointer"
              >
                <LabelList
                  dataKey="Pediatric"
                  position="insideTop"
                  fontSize={9}
                  fill="#fff"
                  formatter={(val) => `${Math.round(val)}%`}
                />
              </Bar>
              <Bar
                dataKey="Radiology"
                stackId="a"
                fill={filters.selectedSpecialty === "Radiology" ? "#7a5a9a" : "#a686c1"}
                onClick={(data) => handleSpecialtyBarClick(data, "Radiology")}
                cursor="pointer"
              >
                <LabelList
                  dataKey="Radiology"
                  position="insideTop"
                  fontSize={9}
                  fill="#fff"
                  formatter={(val) => `${Math.round(val)}%`}
                />
              </Bar>
              <Bar
                dataKey="NP/PA"
                stackId="a"
                fill={filters.selectedSpecialty === "NP/PA" ? "#6a7ac0" : "#8ea2e0"}
                onClick={(data) => handleSpecialtyBarClick(data, "NP/PA")}
                cursor="pointer"
              >
                <LabelList
                  dataKey="NP/PA"
                  position="insideTop"
                  fontSize={9}
                  fill="#fff"
                  formatter={(val) => `${Math.round(val)}%`}
                />
              </Bar>
              <Bar
                dataKey="All Others"
                stackId="a"
                fill={filters.selectedSpecialty === "All Others" ? "#bf9a73" : "#dfb793"}
                radius={[10, 10, 0, 0]}
                onClick={(data) => handleSpecialtyBarClick(data, "All Others")}
                cursor="pointer"
              >
                <LabelList
                  dataKey="All Others"
                  position="insideTop"
                  fontSize={9}
                  fill="#fff"
                  formatter={(val) => `${Math.round(val)}%`}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="flex gap-2 items-center flex-wrap justify-center p-2">
            <div className="flex gap-1 items-center">
              <div className="bg-[#5d708a] rounded-full w-2 h-2"></div>
              <span className="text-[10px] text-gray-600">Child Neurology</span>
            </div>
            <div className="flex gap-1 items-center">
              <div className="bg-[#7cb1cc] rounded-full w-2 h-2"></div>
              <span className="text-[10px] text-gray-600">Neurology</span>
            </div>
            <div className="flex gap-1 items-center">
              <div className="bg-[#c39ac9] rounded-full w-2 h-2"></div>
              <span className="text-[10px] text-gray-600">Neuromuscular</span>
            </div>
            <div className="flex gap-1 items-center">
              <div className="bg-[#1f5f86] rounded-full w-2 h-2"></div>
              <span className="text-[10px] text-gray-600">Pediatric</span>
            </div>
            <div className="flex gap-1 items-center">
              <div className="bg-[#a686c1] rounded-full w-2 h-2"></div>
              <span className="text-[10px] text-gray-600">Radiology</span>
            </div>
            <div className="flex gap-1 items-center">
              <div className="bg-[#8ea2e0] rounded-full w-2 h-2"></div>
              <span className="text-[10px] text-gray-600">NP/PA</span>
            </div>
            <div className="flex gap-1 items-center">
              <div className="bg-[#dfb793] rounded-full w-2 h-2"></div>
              <span className="text-[10px] text-gray-600">All Others</span>
            </div>
          </div>
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
                <th className="p-2 text-left">State</th>
                <th className="p-2 text-left">HCP Segment</th>
                <th className="p-2 text-right">Patient Count</th>
                <th className="p-2 text-left">Affiliated Accounts</th>
              </tr>
            </thead>

            <tbody>
              {table_data.map((hcp, index) => (
                <tr key={index} className="border-t text-gray-800 text-[10px]">
                  <td className="p-2">{hcp.Rank}</td>
                  <td onClick={() => getHCPDetails(hcp["HCP Name"])} className="p-2 cursor-pointer">
                    {hcp["HCP ID"]}
                  </td>
                  <td onClick={() => getHCPDetails(hcp["HCP Name"])} className="p-2 cursor-pointer">
                    {hcp["HCP Name"]}
                  </td>
                  <td className="p-2">{hcp.Specialty}</td>
                  <td className="p-2">{hcp.State}</td>
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
