"use client"

import { useState, useEffect, useRef } from "react"
import { FaUserDoctor } from "react-icons/fa6"
import { ChevronDown, ChevronRight, ChevronLeft, X, Check } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend, LabelList } from "recharts"
import { useNavigate } from "react-router-dom"
import api from "../api/api"

const AccountLandscape = () => {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [openDropdown, setOpenDropdown] = useState(null)
  const dataFetchedRef = useRef(false)

  const [expanded, setExpanded] = useState(false)

  const toggleExpanded = () => setExpanded(!expanded)

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

  // New state for the new charts
  const [hcoGroupByDrugData, setHcoGroupByDrugData] = useState([])
  const [hcoGroupByAgeData, setHcoGroupByAgeData] = useState([])
  const [hcoGroupBySpecialtyData, setHcoGroupBySpecialtyData] = useState([])

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // State for filters - updated to use arrays for multiple selections
  const [filters, setFilters] = useState({
    years: [], // Changed to array for multi-select
    ageFilters: [], // Changed to array for multi-select
    brands: [], // Changed to array for multi-select
    states: [], // Changed to array for multi-select
    kol: "All",
    zolgPrescriber: "All",
    zolgIVTarget: "All",
    // New filters for chart interactions
    selectedQuarter: null,
    selectedYear: null,
    selectedDrug: null,
    selectedGroup: null,
    selectedAgeGroup: null,
    selectedSpecialty: null,
    selectedFacilityType: null,
  })

  // Filter options
  const [filterOptions, setFilterOptions] = useState({
    years: ["All"],
    ages: ["All"],
    brands: ["All"],
    states: ["All"],
  })

  // Handler for state selection from the map
  const handleStateSelect = (stateAbbr) => {
    // If a state is selected on the map, update the state filter
    if (stateAbbr) {
      handleFilterChange("states", stateAbbr)
    } else {
      // If selection is cleared, reset to "All"
      setFilters((prev) => ({ ...prev, states: [] }))
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      if (dataFetchedRef.current) return

      try {
        setLoading(true)

        const response = await fetch(`${api}/fetch-hcolandscape`)
        const jsonData = await response.json()

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

    // Process new chart data
    processHcoGroupByDrugData(filteredData)
    processHcoGroupByAgeData(filteredData)
    processHcoGroupBySpecialtyData(filteredData)
  }

  const getFilteredData = () => {
    return data.filter((item) => {
      // Year filter - check if any selected years match or if no years are selected
      if (filters.years.length > 0 && !filters.years.includes(item.year)) return false

      // Age filter - check if any selected ages match or if no ages are selected
      if (filters.ageFilters.length > 0 && !filters.ageFilters.includes(item.age_group)) return false

      // Brand filter - check if any selected brands match or if no brands are selected
      if (filters.brands.length > 0 && !filters.brands.includes(item.drug_name)) return false

      // State filter - check if any selected states match or if no states are selected
      if (filters.states.length > 0 && !filters.states.includes(item.hco_state)) return false

      // KOL filter
      if (filters.kol !== "All" && item.kol !== filters.kol) return false

      // Zolgensma prescriber filter
      if (filters.zolgPrescriber !== "All" && item.zolg_prescriber !== filters.zolgPrescriber) return false

      // Zolgensma IV target filter
      if (filters.zolgIVTarget !== "All" && item.zolgensma_iv_target !== filters.zolgIVTarget) return false

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

      // HCO Group filter
      if (filters.selectedGroup) {
        // Format the group name (replace DELETE with UNSPECIFIED)
        const formattedItemGroup = item.hco_grouping?.toUpperCase() === "DELETE" ? "UNSPECIFIED" : item.hco_grouping
        if (formattedItemGroup !== filters.selectedGroup) return false
      }

      // Drug filter
      if (filters.selectedDrug) {
        if (item.drug_name !== filters.selectedDrug) return false
      }

      // Age group filter
      if (filters.selectedAgeGroup) {
        const ageMapping = {
          "<2": "0 to 2",
          "2-18": "3 to 17",
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

      // Facility Type filter
      if (filters.selectedFacilityType) {
        // Format the facility type (replace DELETE with UNSPECIFIED)
        const formattedItemType = item.hco_grouping?.toUpperCase() === "DELETE" ? "UNSPECIFIED" : item.hco_grouping
        if (formattedItemType !== filters.selectedFacilityType) return false
      }

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
    // Format group name function
    const formatGroupName = (group) => {
      if (!group || group.trim() === "-") return null // Only skip '-' cases
      group = group.replace(/-/g, "").trim().toUpperCase()
      if (group === "DELETE") return "UNSPECIFIED" // Still convert DELETE
      return group
    }

    // Define display order for HCO groupings
    const displayOrder = [
      "CURRENT IV",
      "IV AFFILIATES",
      "NEW IT TREATMENT CENTERS",
      "NEW TREATMENT CENTERS",
      "UNSPECIFIED",
    ]

    // Group by hco_grouping and count unique HCOs
    const groupMap = new Map()

    filteredData.forEach((item) => {
      if (item.hco_grouping && item.patient_id && item.patient_id !== "-") {
        const group = formatGroupName(item.hco_grouping)

        if (!groupMap.has(group)) {
          groupMap.set(group, new Set())
        }
        groupMap.get(group).add(item.patient_id)
      }
    })

    // Create result array with predefined order
    const result = displayOrder.map((group) => {
      const count = groupMap.has(group) ? groupMap.get(group).size : 0
      return {
        name: group,
        value: count,
      }
    })

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
            // Replace "DELETE" with "UNSPECIFIED"
            const formattedType = type.toUpperCase() === "DELETE" ? "UNSPECIFIED" : type
            entry[formattedType] = 0
          })

          yearQuarterFacilityMap.set(yearQuarterKey, entry)
        }

        // Get the current entry
        const entry = yearQuarterFacilityMap.get(yearQuarterKey)

        // Format the facility type (replace DELETE with UNSPECIFIED)
        const formattedType = item.hco_grouping.toUpperCase() === "DELETE" ? "UNSPECIFIED" : item.hco_grouping

        // Increment the count for this facility type
        if (entry[formattedType] !== undefined) {
          entry[formattedType] += 1
        } else {
          entry[formattedType] = 1
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

  // New function to process HCO Group by Drug data
  const processHcoGroupByDrugData = (filteredData) => {
    // Create a Map to track unique patient IDs for each group and drug
    const groupDrugPatientMap = new Map()

    // Process each record
    filteredData.forEach((item) => {
      if (
        item.hco_grouping &&
        item.drug_name &&
        item.patient_id &&
        item.hco_grouping !== "-" &&
        item.drug_name !== "-" &&
        item.patient_id !== "-"
      ) {
        // Format the group name (replace DELETE with UNSPECIFIED)
        const group = item.hco_grouping.toUpperCase() === "DELETE" ? "UNSPECIFIED" : item.hco_grouping
        const drug = item.drug_name

        // Create key for group-drug combination
        const key = `${group}_${drug}`

        // Initialize set for this group-drug if it doesn't exist
        if (!groupDrugPatientMap.has(key)) {
          groupDrugPatientMap.set(key, new Set())
        }

        // Add patient ID to the set for this group-drug
        groupDrugPatientMap.get(key).add(item.patient_id)
      }
    })

    // Get unique groups
    const groups = [
      ...new Set(
        filteredData
          .map((item) => {
            const group = item.hco_grouping
            return group && group !== "-" ? (group.toUpperCase() === "DELETE" ? "UNSPECIFIED" : group) : null
          })
          .filter(Boolean),
      ),
    ]

    // Define display order for HCO groupings
    const displayOrder = [
      "CURRENT IV",
      "IV AFFILIATES",
      "NEW IT TREATMENT CENTERS",
      "NEW TREATMENT CENTERS",
      "UNSPECIFIED",
    ]

    // Sort groups according to display order
    const sortedGroups = groups.sort((a, b) => {
      const indexA = displayOrder.indexOf(a)
      const indexB = displayOrder.indexOf(b)
      return indexA - indexB
    })

    // Format data for stacked bar chart
    const formattedData = sortedGroups.map((group) => {
      const result = { group }

      // Count patients for each drug in this group
      result.Zolgensma = groupDrugPatientMap.get(`${group}_ZOLGENSMA`)?.size || 0
      result.Spinraza = groupDrugPatientMap.get(`${group}_SPINRAZA`)?.size || 0
      result.Evrysdi = groupDrugPatientMap.get(`${group}_EVRYSDI`)?.size || 0

      // Calculate total
      result.total = result.Zolgensma + result.Spinraza + result.Evrysdi

      return result
    })

    setHcoGroupByDrugData(formattedData)
  }

  // New function to process HCO Group by Age data
  const processHcoGroupByAgeData = (filteredData) => {
    // Get unique groups
    const groups = [
      ...new Set(
        filteredData
          .map((item) => {
            const group = item.hco_grouping
            return group && group !== "-" ? (group.toUpperCase() === "DELETE" ? "UNSPECIFIED" : group) : null
          })
          .filter(Boolean),
      ),
    ]

    // Define display order for HCO groupings
    const displayOrder = [
      "CURRENT IV",
      "IV AFFILIATES",
      "NEW IT TREATMENT CENTERS",
      "NEW TREATMENT CENTERS",
      "UNSPECIFIED",
    ]

    // Create a map to track unique HCO IDs for each group and age group
    const groupAgeHcoMap = new Map()

    filteredData.forEach((item) => {
      if (
        item.hco_grouping &&
        item.rend_hco_npi &&
        item.age_group &&
        item.hco_grouping !== "-" &&
        item.rend_hco_npi !== "-" &&
        item.age_group !== "-"
      ) {
        // Format the group name (replace DELETE with UNSPECIFIED)
        const group = item.hco_grouping.toUpperCase() === "DELETE" ? "UNSPECIFIED" : item.hco_grouping
        const key = `${group}_${item.age_group}`

        if (!groupAgeHcoMap.has(key)) {
          groupAgeHcoMap.set(key, new Set())
        }

        groupAgeHcoMap.get(key).add(item.rend_hco_npi)
      }
    })

    // Sort groups according to display order
    const sortedGroups = groups.sort((a, b) => {
      const indexA = displayOrder.indexOf(a)
      const indexB = displayOrder.indexOf(b)
      return indexA - indexB
    })

    // Format for chart
    const ageGroupData = sortedGroups.map((group) => {
      const result = { group }

      // Map age groups to chart categories
      const ageMapping = {
        "0 to 2": "<2",
        "3 to 17": "2-18",
        "Above 18": ">18",
      }

      // Initialize all age groups to 0
      Object.values(ageMapping).forEach((chartAge) => {
        result[chartAge] = 0
      })

      // Fill in counts for each age group
      Object.entries(ageMapping).forEach(([apiAge, chartAge]) => {
        const key = `${group}_${apiAge}`
        if (groupAgeHcoMap.has(key)) {
          result[chartAge] = groupAgeHcoMap.get(key).size
        }
      })

      // Calculate total for each group
      const total = result["<2"] + result["2-18"] + result[">18"]
      result.total = total

      // Calculate percentage values for 100% stacked bar
      if (total > 0) {
        result["<2"] = ((result["<2"] / total) * 100).toFixed(2)
        result["2-18"] = ((result["2-18"] / total) * 100).toFixed(2)
        result[">18"] = ((result[">18"] / total) * 100).toFixed(2)
      }

      return result
    })

    setHcoGroupByAgeData(ageGroupData)
  }

  // New function to process HCO Group by Specialty data
  const processHcoGroupBySpecialtyData = (filteredData) => {
    // Get unique groups
    const groups = [
      ...new Set(
        filteredData
          .map((item) => {
            const group = item.hco_grouping
            return group && group !== "-" ? (group.toUpperCase() === "DELETE" ? "UNSPECIFIED" : group) : null
          })
          .filter(Boolean),
      ),
    ]

    // Define display order for HCO groupings
    const displayOrder = [
      "CURRENT IV",
      "IV AFFILIATES",
      "NEW IT TREATMENT CENTERS",
      "NEW TREATMENT CENTERS",
      "UNSPECIFIED",
    ]

    // Create a map to track unique HCO IDs for each group and specialty
    const groupSpecialtyHcoMap = new Map()

    filteredData.forEach((item) => {
      if (
        item.hco_grouping &&
        item.rend_hco_npi &&
        item.final_spec &&
        item.hco_grouping !== "-" &&
        item.rend_hco_npi !== "-" &&
        item.final_spec !== "-"
      ) {
        // Format the group name (replace DELETE with UNSPECIFIED)
        const group = item.hco_grouping.toUpperCase() === "DELETE" ? "UNSPECIFIED" : item.hco_grouping
        const specialty = item.final_spec.toUpperCase()
        const key = `${group}_${specialty}`

        if (!groupSpecialtyHcoMap.has(key)) {
          groupSpecialtyHcoMap.set(key, new Set())
        }

        groupSpecialtyHcoMap.get(key).add(item.rend_hco_npi)
      }
    })

    // Sort groups according to display order
    const sortedGroups = groups.sort((a, b) => {
      const indexA = displayOrder.indexOf(a)
      const indexB = displayOrder.indexOf(b)
      return indexA - indexB
    })

    // Format for chart
    const specialtyData = sortedGroups.map((group) => {
      const result = { group }

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
        const key = `${group}_${apiSpecialty}`
        if (groupSpecialtyHcoMap.has(key)) {
          result[chartSpecialty] = groupSpecialtyHcoMap.get(key).size
        }
      })

      // Count "All Others" - specialties not in our predefined categories
      groupSpecialtyHcoMap.forEach((hcos, key) => {
        if (key.startsWith(`${group}_`)) {
          const specialty = key.substring(group.length + 1)
          if (!Object.keys(specialtyCategories).includes(specialty)) {
            result["All Others"] += hcos.size
          }
        }
      })

      // Calculate total for the group
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
          if (key !== "group" && key !== "total") {
            result[key] = Number.parseFloat(((result[key] / total) * 100).toFixed(2))
          }
        })
      }

      return result
    })

    setHcoGroupBySpecialtyData(specialtyData)
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

  // Handle filter changes for multi-select
  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
  
      if (filterName === "years" || filterName === "ageFilters" || filterName === "brands" || filterName === "states") {
        const currentValues = [...prev[filterName]];
  
        if (value === "All") {
          return { ...prev, [filterName]: [] };
        } else {
          const valueIndex = currentValues.indexOf(value);
          if (valueIndex === -1) {
            currentValues.push(value);
          } else {
            currentValues.splice(valueIndex, 1);
          }
  
          newFilters[filterName] = currentValues;
        }
      } else {
        newFilters[filterName] = value;
      }
  
      return newFilters;
    });
  
    setCurrentPage(1);
  
    // REMOVE this line to prevent dropdown from closing
    // setOpenDropdown(null);
  };
  

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

  // Calculate total pages
  const totalPages = Math.ceil(allAccountTableData.length / rowsPerPage)

  // Handle individual bar click for Facility Type by Quarter chart
  const handleIndividualBarClick = (data, dataKey) => {
    // Extract year and quarter from the clicked bar
    const year = data.year
    const quarterMatch = data.quarter.match(/Q(\d+)/)
    const quarter = quarterMatch ? quarterMatch[1] : null

    if (year && quarter && dataKey) {
      // Check if we're already filtering by this exact combination
      if (
        filters.selectedYear === year &&
        filters.selectedQuarter === quarter &&
        filters.selectedFacilityType === dataKey
      ) {
        // Clear the filters if clicking the same bar again
        setFilters((prev) => ({
          ...prev,
          selectedYear: null,
          selectedQuarter: null,
          selectedFacilityType: null,
        }))
      } else {
        // Set the filters for this specific quarter-year-facility combination
        setFilters((prev) => ({
          ...prev,
          selectedYear: year,
          selectedQuarter: quarter,
          selectedFacilityType: dataKey,
        }))
      }
    }
  }

  // Handle individual bar click for HCO Group by Drug chart
  const handleDrugBarClick = (data, dataKey) => {
    // Map dataKey to actual drug name in the database
    const drugMap = {
      Zolgensma: "ZOLGENSMA",
      Spinraza: "SPINRAZA",
      Evrysdi: "EVRYSDI",
    }

    const drugName = drugMap[dataKey]
    const group = data.group

    if (group && drugName) {
      // Check if we're already filtering by this exact combination
      if (filters.selectedGroup === group && filters.selectedDrug === drugName) {
        // Clear the filters if clicking the same bar again
        setFilters((prev) => ({
          ...prev,
          selectedGroup: null,
          selectedDrug: null,
        }))
      } else {
        // Set the filters for this specific drug and group combination
        setFilters((prev) => ({
          ...prev,
          selectedGroup: group,
          selectedDrug: drugName,
        }))
      }
    }
  }

  // Handle individual bar click for Age Group chart
  const handleAgeGroupBarClick = (data, dataKey) => {
    const group = data.group
    const ageGroup = dataKey // "<2", "2-18", or ">18"

    if (group && ageGroup) {
      // Check if we're already filtering by this exact combination
      if (filters.selectedGroup === group && filters.selectedAgeGroup === ageGroup) {
        // Clear the filters if clicking the same bar again
        setFilters((prev) => ({
          ...prev,
          selectedGroup: null,
          selectedAgeGroup: null,
        }))
      } else {
        // Set the filters for this specific age group and group combination
        setFilters((prev) => ({
          ...prev,
          selectedGroup: group,
          selectedAgeGroup: ageGroup,
        }))
      }
    }
  }

  // Handle individual bar click for Specialty chart
  const handleSpecialtyBarClick = (data, dataKey) => {
    const group = data.group
    const specialty = dataKey // "Child Neurology", "Neurology", etc.

    if (group && specialty) {
      // Check if we're already filtering by this exact combination
      if (filters.selectedGroup === group && filters.selectedSpecialty === specialty) {
        // Clear the filters if clicking the same bar again
        setFilters((prev) => ({
          ...prev,
          selectedGroup: null,
          selectedSpecialty: null,
        }))
      } else {
        // Set the filters for this specific specialty and group combination
        setFilters((prev) => ({
          ...prev,
          selectedGroup: group,
          selectedSpecialty: specialty,
        }))
      }
    }
  }

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      years: [],
      ageFilters: [],
      brands: [],
      states: [],
      kol: "All",
      zolgPrescriber: "All",
      zolgIVTarget: "All",
      selectedQuarter: null,
      selectedYear: null,
      selectedDrug: null,
      selectedGroup: null,
      selectedAgeGroup: null,
      selectedSpecialty: null,
      selectedFacilityType: null,
    })
  }

  // Check if any filters are active
  const hasActiveFilters = () => {
    return (
      filters.years.length > 0 ||
      filters.ageFilters.length > 0 ||
      filters.brands.length > 0 ||
      filters.states.length > 0 ||
      filters.kol !== "All" ||
      filters.zolgPrescriber !== "All" ||
      filters.zolgIVTarget !== "All" ||
      filters.selectedQuarter !== null ||
      filters.selectedYear !== null ||
      filters.selectedDrug !== null ||
      filters.selectedGroup !== null ||
      filters.selectedAgeGroup !== null ||
      filters.selectedSpecialty !== null ||
      filters.selectedFacilityType !== null
    )
  }

  // Helper function to get display text for multi-select filters
  const getFilterDisplayText = (filterName) => {
    const values = filters[filterName]
    if (values.length === 0) return "All"
    if (values.length === 1) return values[0]
    return `${values.length} selected`
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 w-full p-2">
      {/* Filters */}
      <div className="flex gap-4 items-center flex-wrap">
        {/* Age Filter - Updated to use checkboxes */}
        <div className="relative">
          <div
            className="flex items-center py-1 px-2 rounded-lg bg-white justify-between cursor-pointer min-w-[120px]"
           
            onClick={() => toggleDropdown("age")}
          >
            <span className="text-[12px] text-gray-600">Age: {getFilterDisplayText("ageFilters")}</span>
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
                    handleFilterChange("ageFilters", age)
                  }}
                >
                  <div
                    className={`w-4 h-4 mr-2 border rounded flex items-center justify-center ${
                      age === "All"
                        ? filters.ageFilters.length === 0
                          ? "bg-blue-500 border-blue-500"
                          : "border-gray-300"
                        : filters.ageFilters.includes(age)
                          ? "bg-blue-500 border-blue-500"
                          : "border-gray-300"
                    }`}
                  >
                    {(age === "All" && filters.ageFilters.length === 0) ||
                    (age !== "All" && filters.ageFilters.includes(age)) ? (
                      <Check className="w-3 h-3 text-white" />
                    ) : null}
                  </div>
                  {age}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Brand Filter - Updated to use checkboxes */}
        <div className="relative">
          <div
            className="flex items-center py-1 px-2 rounded-lg bg-white justify-between cursor-pointer min-w-[120px]"
            onClick={() => toggleDropdown("brand")}
          >
            <span className="text-[12px] text-gray-600">Brand: {getFilterDisplayText("brands")}</span>
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
                  <div
                    className={`w-4 h-4 mr-2 border rounded flex items-center justify-center ${
                      brand === "All"
                        ? filters.brands.length === 0
                          ? "bg-blue-500 border-blue-500"
                          : "border-gray-300"
                        : filters.brands.includes(brand)
                          ? "bg-blue-500 border-blue-500"
                          : "border-gray-300"
                    }`}
                  >
                    {(brand === "All" && filters.brands.length === 0) ||
                    (brand !== "All" && filters.brands.includes(brand)) ? (
                      <Check className="w-3 h-3 text-white" />
                    ) : null}
                  </div>
                  {brand}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* State Filter - Updated to use checkboxes */}
        <div className="relative">
          <div
            className="flex items-center py-1 px-2 rounded-lg bg-white justify-between cursor-pointer min-w-[120px]"
            onClick={() => toggleDropdown("state")}
          >
            <span className="text-[12px] text-gray-600">State: {getFilterDisplayText("states")}</span>
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

        {/* Active Filters Display */}
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

        {filters.selectedFacilityType && (
          <div className="flex items-center bg-blue-100 text-blue-800 rounded-lg px-2 py-1 text-[11px]">
            Facility Type: {filters.selectedFacilityType}
            <button
              onClick={() => setFilters((prev) => ({ ...prev, selectedFacilityType: null }))}
              className="ml-1 text-blue-600 hover:text-blue-800"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {filters.selectedGroup && (
          <div className="flex items-center bg-blue-100 text-blue-800 rounded-lg px-2 py-1 text-[11px]">
            Group: {filters.selectedGroup}
            {filters.selectedDrug && ` (Drug: ${filters.selectedDrug})`}
            {filters.selectedAgeGroup && ` (Age: ${filters.selectedAgeGroup})`}
            {filters.selectedSpecialty && ` (Specialty: ${filters.selectedSpecialty})`}
            <button
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  selectedGroup: null,
                  selectedDrug: null,
                  selectedAgeGroup: null,
                  selectedSpecialty: null,
                }))
              }
              className="ml-1 text-blue-600 hover:text-blue-800"
            >
              <X size={12} />
            </button>
          </div>
        )}

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
            <span className="text-gray-500 text-[11px] font-[500]">Rendering HCOs</span>
          </div>
          <span className="text-gray-700 text-[16px] font-[500] pl-2">{kpiData.renderingHCOs.toLocaleString()}</span>
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
          <span className="text-gray-700 text-[16px] font-[500] pl-2">{kpiData.patientsReferred.toLocaleString()}</span>
        </div>

        <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[20%] h-20 p-2 justify-between">
          <div className="flex gap-2 items-center">
            <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
              <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
            </div>
            <span className="text-gray-500 text-[11px] font-[500]">Referring HCOs</span>
          </div>
          <span className="text-gray-700 text-[16px] font-[500] pl-2">{kpiData.referringHCOs.toLocaleString()}</span>
        </div>
      </div>

      {/* Year Filter - Updated to allow multiple selections */}
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

      {/* Facility Type by Quarter Chart - Full Width */}
      <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-56 p-2">
        <span className="text-gray-500 text-[11px] font-[500] pb-4">Accounts by Facility Type</span>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={facilityTypeByQuarterData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }} barSize={30}>
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

                // Define a fixed mapping of facility types to colors
                const colorMap = {
                  "CURRENT IV": "#00599D",
                  "NEW TREATMENT CENTERS": "#4A7D99",
                  "IV AFFILIATES": "#52C97C",
                  "NEW IT TREATMENT CENTERS": "#C087CB",
                  UNSPECIFIED: "#91BDD8",
                  // Add fallback colors for any other facility types
                  OTHER: "#E6A0C4",
                }

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
                  // Use the color map to get the color, or fall back to a default color
                  const color = colorMap[key] || colorMap["OTHER"]

                  return (
                    <Bar
                      key={key}
                      dataKey={key}
                      stackId="a"
                      fill={color}
                      name={key}
                      onClick={(data) => handleIndividualBarClick(data, key)}
                      cursor="pointer"
                    >
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
        {/* HCO Group by Drug Chart - Replacing the original horizontal bar chart */}
        <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[50%] h-72 p-2">
          <div className="flex gap-2 items-center mb-3">
            <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 576 512"
                className="text-[#004567] h-[0.8rem] w-[0.8rem]"
              >
                <path
                  fill="currentColor"
                  d="M142.4 21.9c5.6 16.8-3.5 34.9-20.2 40.5L96 71.1V192c0 53 43 96 96 96s96-43 96-96V71.1l-26.1-8.7c-16.8-5.6-25.8-23.7-20.2-40.5s23.7-25.8 40.5-20.2l26.1 8.7C334.4 19.1 352 43.5 352 71.1V192c0 53 43 96 96 96s96-43 96-96V71.1l-26.1-8.7c-16.8-5.6-25.8-23.7-20.2-40.5s23.7-25.8 40.5-20.2l26.1 8.7C334.4 19.1 352 43.5 352 71.1V192c0 77.2-54.6 141.6-127.3 156.7C231 404.6 278.4 448 336 448c61.9 0 112-50.1 112-112V265.3c-28.3-12.3-48-40.5-48-73.3c0-44.2 35.8-80 80-80s80 35.8 80 80c0 32.8-19.7 61-48 73.3V336c0 97.2-78.8 176-176 176c-92.9 0-168.9-71.9-175.5-163.1C87.2 334.2 32 269.6 32 192V71.1c0-27.5 17.6-52 43.8-60.7l26.1-8.7c16.8-5.6 34.9 3.5 40.5 20.2zM480 224c17.7 0 32-14.3 32-32s-14.3-32-32-32s-32 14.3-32 32s14.3 32 32 32z"
                />
              </svg>
            </div>
            <span className="text-gray-500 text-[11px] font-[500]">HCO Group by Patient</span>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hcoGroupByDrugData} margin={{ top: 10, right: 30, left: 0 }} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="group" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value) => `${value}`} labelStyle={{ fontSize: 11 }} itemStyle={{ fontSize: 10 }} />
              <Bar
                dataKey="Zolgensma"
                stackId="a"
                fill={filters.selectedDrug === "ZOLGENSMA" ? "#6a3d81" : "#8E58B3"}
                onClick={(data) => handleDrugBarClick(data, "Zolgensma")}
                cursor="pointer"
              />
              <Bar
                dataKey="Spinraza"
                stackId="a"
                fill={filters.selectedDrug === "SPINRAZA" ? "#1c6f7c" : "#2A9FB0"}
                onClick={(data) => handleDrugBarClick(data, "Spinraza")}
                cursor="pointer"
              />
              <Bar
                dataKey="Evrysdi"
                stackId="a"
                fill={filters.selectedDrug === "EVRYSDI" ? "#9c003f" : "#D50057"}
                onClick={(data) => handleDrugBarClick(data, "Evrysdi")}
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

        {/* HCO Group Split by Age Group Chart */}
        <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[50%] h-72 p-2">
          <div className="flex gap-2 items-center justify-between w-full pb-4">
            <span className="text-gray-500 text-[11px] font-[500]">HCO Group Split by Age Group</span>
          </div>

          <ResponsiveContainer width="100%" height="100%" style={{ marginLeft: -10, marginBottom: -20 }}>
            <BarChart data={hcoGroupByAgeData} barSize={50}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="group" tick={{ fontSize: 10 }} />

              <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" tickFormatter={(value) => Math.round(value)} />

              <Tooltip
                formatter={(value) => `${Math.round(value)}%`}
                labelStyle={{ fontSize: 11 }}
                itemStyle={{ fontSize: 10 }}
              />

              <Bar
                dataKey="<2"
                stackId="a"
                fill={filters.selectedAgeGroup === "<2" ? "#1a5a7c" : "#1b5a7d"}
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
                dataKey="2-18"
                stackId="a"
                fill={filters.selectedAgeGroup === "2-18" ? "#5a6a7c" : "#5f6d87"}
                onClick={(data) => handleAgeGroupBarClick(data, "2-18")}
                cursor="pointer"
              >
                <LabelList
                  dataKey="2-18"
                  position="insideTop"
                  fontSize={9}
                  fill="#fff"
                  formatter={(val) => `${Math.round(val)}%`}
                />
              </Bar>

              <Bar
                dataKey=">18"
                stackId="a"
                fill={filters.selectedAgeGroup === ">18" ? "#7a9ab0" : "#7db8d8"}
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
              <div className="bg-[#1b5a7d] rounded-full w-2 h-2"></div>
              <span className="text-[10px] text-gray-600">{"<2"}</span>
            </div>
            <div className="flex gap-1 items-center">
              <div className="bg-[#5f6d87] rounded-full w-2 h-2"></div>
              <span className="text-[10px] text-gray-600">{"2-18"}</span>
            </div>
            <div className="flex gap-1 items-center">
              <div className="bg-[#7db8d8] rounded-full w-2 h-2"></div>
              <span className="text-[10px] text-gray-600">{">18"}</span>
            </div>
          </div>
        </div>

        {/* HCO Group Split by Specialty Chart */}
        {/* <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[34%] h-72 p-2">
          <div className="flex gap-4 items-center justify-between w-full pb-4">
            <div>
              <span className="text-gray-500 text-[11px] font-[500] text-wrap">HCO Group Split by Specialty</span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height="80%" style={{ marginRight: -10, marginBottom: -20 }}>
            <BarChart data={hcoGroupBySpecialtyData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }} barSize={60}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="group" tick={{ fontSize: 10 }} />
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
        </div> */}
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
                {/* <th className="p-2 text-left">Account Tier</th> */}
                <th className="p-2 text-left">Account Grouping</th>
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
                  {/* <td className="p-2">{hco["Account Tier"]}</td> */}
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