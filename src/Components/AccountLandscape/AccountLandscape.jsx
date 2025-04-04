"use client"

import { useState, useEffect } from "react"
import { FaUserDoctor } from "react-icons/fa6"
import { ChevronDown, MoveUpRight } from "lucide-react"
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { ComposableMap, Geographies, Geography } from "react-simple-maps"
import { useNavigate } from "react-router-dom"

const AccountLandscape = () => {
  // State for storing fetched data
  const navigate = useNavigate();
  const [kpiData, setKpiData] = useState(null)
  const [quarterData, setQuarterData] = useState([])
  const [hcoData, setHcoData] = useState([])
  const [loading, setLoading] = useState(true)

  // State for filters
  const [filters, setFilters] = useState({
    ageFilter: "All",
    brand: "All",
    state: "All",
    kol: "All",
    zolgPrescriber: "All",
    zolgIVTarget: "All",
  })

  // Extract unique filter options
  const getFilterOptions = (field) => {
    if (!hcoData || hcoData.length === 0) return []

    const options = new Set()
    hcoData.forEach((item) => {
      if (item[field] && item[field] !== "-") {
        options.add(item[field])
      }
    })

    return Array.from(options)
  }

  // Extract state from address
  const extractState = (address) => {
    if (!address) return ""
    const matches = address.match(/,\s*([A-Z]{2}),/)
    return matches ? matches[1] : ""
  }

  // Get unique states
  const getStateOptions = () => {
    if (!hcoData || hcoData.length === 0) return []

    const states = new Set()
    hcoData.forEach((item) => {
      const state = extractState(item.address)
      if (state) {
        states.add(state)
      }
    })

    return Array.from(states)
  }

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch all data in parallel
        const [kpiResponse, quarterResponse, hcoResponse] = await Promise.all([
          fetch("https://hcp-hco-backend.onrender.com/fetch-hcolandscape-kpicard"),
          fetch("https://hcp-hco-backend.onrender.com/fetch-hcolandscape-quater"),
          fetch("https://hcp-hco-backend.onrender.com/hco-360"),
        ])

        const kpiResult = await kpiResponse.json()
        const quarterResult = await quarterResponse.json()
        const hcoResult = await hcoResponse.json()

        setKpiData(kpiResult[0]) // Assuming the API returns an array with one object
        setQuarterData(quarterResult)
        setHcoData(hcoResult)
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Process facility type data
  const processFacilityTypeData = () => {
    if (!hcoData || hcoData.length === 0) return []

    // Count occurrences of each hco_grouping, excluding '-'
    const groupingCounts = {}
    hcoData.forEach((item) => {
      const grouping = item.hco_grouping
      if (grouping && grouping !== "-") {
        groupingCounts[grouping] = (groupingCounts[grouping] || 0) + 1
      }
    })

    // Convert to array format for pie chart
    const colors = ["#00599D", "#6A99B5", "#7DFFA8", "#F0C3F7", "#C8E3F5"]
    return Object.entries(groupingCounts).map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length],
    }))
  }

  // Process HCO tier data
  const processHcoTierData = () => {
    if (!hcoData || hcoData.length === 0) return []
  
    const tierMap = new Map()
  
    // Group by tier and collect unique hco_mdm
    hcoData.forEach((item) => {
      const tier = item.hco_mdm_tier
      const hcoId = item.hco_mdm
  
      if (tier && tier !== "-" && hcoId && hcoId !== "-") {
        if (!tierMap.has(tier)) {
          tierMap.set(tier, new Set())
        }
        tierMap.get(tier).add(hcoId)
      }
    })
  
    const colors = ["#B073FE", "#FDBA74", "#B4F06C", "#6EE79A"]
  
    // Sort tier entries - assuming tier is like "Tier 1", "Tier 2", etc.
    const sortedEntries = Array.from(tierMap.entries()).sort(([a], [b]) => {
      const aNum = parseInt(a.replace(/\D/g, ""), 10)
      const bNum = parseInt(b.replace(/\D/g, ""), 10)
      return aNum - bNum
    })
  
    return sortedEntries.map(([label, hcoSet], index) => ({
      label,
      value: hcoSet.size,
      color: colors[index % colors.length],
    }))
  }
  

  // Apply filters to hcoData
  const getFilteredHcoData = () => {
    if (!hcoData || hcoData.length === 0) return []

    return hcoData.filter((item) => {
      // Age filter
      if (filters.ageFilter !== "All" && item.age_group !== filters.ageFilter) {
        return false
      }

      // Brand filter
      if (filters.brand !== "All" && item.drug_name !== filters.brand) {
        return false
      }

      // State filter
      const itemState = extractState(item.address)
      if (filters.state !== "All" && itemState !== filters.state) {
        return false
      }

      // KOL filter
      if (filters.kol !== "All" && item.kol !== filters.kol) {
        return false
      }

      // Zolgensma prescriber filter
      if (filters.zolgPrescriber !== "All" && item.zolg_prescriber !== filters.zolgPrescriber) {
        return false
      }

      // Zolgensma IV target filter
      if (filters.zolgIVTarget !== "All" && item.zolgensma_iv_target !== filters.zolgIVTarget) {
        return false
      }

      return true
    })
  }

  // Process accounts table data
  const processAccountsTableData = () => {
    const filteredData = getFilteredHcoData()
    if (filteredData.length === 0) return []

    // Group by hco_mdm to get unique accounts
    const accountsMap = new Map()

    filteredData.forEach((item) => {
      if (!item.hco_mdm || item.hco_mdm === "-") return

      if (!accountsMap.has(item.hco_mdm)) {
        accountsMap.set(item.hco_mdm, {
          accountId: item.hco_mdm,
          hcps: new Set(),
          patients: 0,
          affiliatedAccount: item.hco_mdm_name || "-",
          tier: item.hco_mdm_tier || "-",
          archetype: item.hco_grouping || "-",
          state: extractState(item.address) || "-",
        })
      }

      const account = accountsMap.get(item.hco_mdm)
      if (item.hcp_id && item.hcp_id !== "-") account.hcps.add(item.hcp_id)
      if (item.patient_id && item.patient_id !== "-") account.patients += 1
    })

    // Convert to array and sort by patient count
    const accountsArray = Array.from(accountsMap.values()).map((account) => ({
      ...account,
      hcps: account.hcps.size,
    }))

    accountsArray.sort((a, b) => b.patients - a.patients)

    // Add rank and format for table
    return accountsArray.slice(0, 5).map((account, index) => ({
      Rank: `0${index + 1}`,
      "Account ID": account.accountId,
      "No. HCPs": account.hcps,
      "SMA. Patients": account.patients,
      "Affiliated Account": account.affiliatedAccount,
      "Account Tier": account.tier,
      "Account Archetype": account.archetype,
    }))
  }

  // Format quarter data for line chart
  const formatQuarterData = () => {
    if (!quarterData || quarterData.length === 0) return []

    return quarterData.map((item) => ({
      month: `Quarter ${item.quarter}`,
      "Archetype 1": item.patient_count,
    }))
  }

  // Calculate facility type data
  const facilityTypeData = processFacilityTypeData()

  // Calculate HCO tier data
  const potential_data = processHcoTierData()
  const maxValue = Math.max(...potential_data.map((item) => item.value), 0)

  // Get accounts table data
  const accountTableData = processAccountsTableData()

  // Get filter options
  const ageOptions = getFilterOptions("age_group")
  const brandOptions = getFilterOptions("drug_name")
  const stateOptions = getStateOptions()

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

  // Handle filter changes
  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: value,
    }))
  }

  // Toggle filter buttons
  const toggleFilter = (filterName, value) => {
    handleFilterChange(filterName, filters[filterName] === value ? "All" : value)
  }

  // Show dropdown options
  const [openDropdown, setOpenDropdown] = useState(null)

  const toggleDropdown = (dropdown) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown)
  }

  if (loading) {
    return  <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                
            </div>
  }

  const getHCODetails = (hcoId) => {
    navigate("/hco", { state: { hco_id: hcoId } })
  }

  return (
    <div className="flex flex-col gap-4 w-full p-2">
      <div className="flex gap-4 w-full">
        <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[20%] h-20 p-2 justify-between">
          <div className="flex gap-2 items-center">
            <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
              <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
            </div>
            <span className="text-gray-500 text-[11px] font-[500]">Rendering HCOs</span>
          </div>
          <span className="text-gray-700 text-[16px] font-[500] pl-2">{kpiData.hco_count}</span>
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
              <span className="text-gray-700 text-[16px] font-[500]">{kpiData.pt_12_mth}</span>
              <MoveUpRight className="text-green-500 ml-2" style={{ width: "10px", height: "10px" }} />
              <span className="text-green-500 text-xs">5.2%</span>
              <span className="text-gray-500 text-xs">vs last month</span>
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
          <span className="text-gray-700 text-[16px] font-[500] pl-2">{kpiData.avg_patients_per_hco.toFixed(2)}</span>
        </div>

        <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[20%] h-20 p-2 justify-between">
          <div className="flex gap-2 items-center">
            <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
              <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
            </div>
            <span className="text-gray-500 text-[11px] font-[500]">SMA Patients Referred in Last 12M</span>
          </div>
          <span className="text-gray-700 text-[16px] font-[500] pl-2">{kpiData.ref_pt_12_mth}</span>
        </div>

        <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[20%] h-20 p-2 justify-between">
          <div className="flex gap-2 items-center">
            <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
              <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
            </div>
            <span className="text-gray-500 text-[11px] font-[500]">Referring HCOs</span>
          </div>
          <span className="text-gray-700 text-[16px] font-[500] pl-2">{kpiData.ref_hco_npi_mdm}</span>
        </div>
      </div>
      <div className="flex gap-4 w-full">
        <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[60%] h-56 p-2">
          <span className="text-gray-500 text-[11px] font-[500] pb-4">#QoQ SMA Treated Patients by Archetype</span>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={formatQuarterData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 10 }} itemStyle={{ fontSize: 10 }} />

              {/* Lines for each Archetype */}
              <Line type="monotone" dataKey="Archetype 1" stroke="#0b5cab" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[40%] h-56 p-2">
          <div className="flex gap-2 items-center justify-between w-full pb-4">
            <span className="text-gray-500 text-[11px] font-[500]">Accounts by Facility Type</span>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={facilityTypeData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={60}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
              >
                {facilityTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 10 }} itemStyle={{ fontSize: 10 }} />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                wrapperStyle={{ fontSize: "10px" }}
                formatter={(value, entry, index) => (
                  <span style={{ marginBottom: "4px", display: "inline-block" }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex gap-4 w-full">
        <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[40%] h-60 p-2">
          <span className="text-gray-500 text-[11px] font-[500] pb-4">HCO Tier by SMA Patients Potential</span>
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

      <div className="flex flex-col bg-white rounded-xl border border-gray-300 w-full shadow-sm">
        <div className="flex gap-2 items-center p-2">
          <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
            <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
          </div>
          <span className="text-gray-500 text-[11px] font-[500]">Accounts List</span>

          <div className="flex gap-2 items-center">
            <div className="relative">
              <div
                className="flex items-center rounded-xl border p-1 gap-1 cursor-pointer"
                onClick={() => toggleDropdown("age")}
              >
                <span className="text-gray-600 text-[10px]">
                  Age Filter: {filters.ageFilter === "All" ? "All" : filters.ageFilter}
                </span>
                <ChevronDown className="w-3 h-3 text-gray-500" />
              </div>
              {openDropdown === "age" && (
                <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-md z-10">
                  <div
                    className="p-1 text-[10px] hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      handleFilterChange("ageFilter", "All")
                      setOpenDropdown(null)
                    }}
                  >
                    All
                  </div>
                  {ageOptions.map((option, index) => (
                    <div
                      key={index}
                      className="p-1 text-[10px] hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        handleFilterChange("ageFilter", option)
                        setOpenDropdown(null)
                      }}
                    >
                      {option}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <div
                className="flex items-center rounded-xl border p-1 gap-1 cursor-pointer"
                onClick={() => toggleDropdown("brand")}
              >
                <span className="text-gray-600 text-[10px]">
                  Brand: {filters.brand === "All" ? "All" : filters.brand}
                </span>
                <ChevronDown className="w-3 h-3 text-gray-500" />
              </div>
              {openDropdown === "brand" && (
                <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-md z-10">
                  <div
                    className="p-1 text-[10px] hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      handleFilterChange("brand", "All")
                      setOpenDropdown(null)
                    }}
                  >
                    All
                  </div>
                  {brandOptions.map((option, index) => (
                    <div
                      key={index}
                      className="p-1 text-[10px] hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        handleFilterChange("brand", option)
                        setOpenDropdown(null)
                      }}
                    >
                      {option}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <div
                className="flex items-center rounded-xl border p-1 gap-1 cursor-pointer"
                onClick={() => toggleDropdown("state")}
              >
                <span className="text-gray-600 text-[10px]">
                  State: {filters.state === "All" ? "All" : filters.state}
                </span>
                <ChevronDown className="w-3 h-3 text-gray-500" />
              </div>
              {openDropdown === "state" && (
                <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-md z-10 max-h-32 overflow-y-auto">
                  <div
                    className="p-1 text-[10px] hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      handleFilterChange("state", "All")
                      setOpenDropdown(null)
                    }}
                  >
                    All
                  </div>
                  {stateOptions.map((option, index) => (
                    <div
                      key={index}
                      className="p-1 text-[10px] hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        handleFilterChange("state", option)
                        setOpenDropdown(null)
                      }}
                    >
                      {option}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center rounded-xl border p-1 gap-2">
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
            <div className="flex items-center rounded-xl border p-1 gap-2">
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
            <div className="flex items-center rounded-xl border p-1 gap-2">
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
                  <td onClick={() => getHCODetails(hco["Account ID"])} className="p-2 cursor-pointer">{hco["Account ID"]}</td>
                  <td className="p-2">{hco["No. HCPs"]}</td>
                  <td className="p-2">{hco["SMA. Patients"]}</td>
                  <td onClick={() => getHCODetails(hco["Account ID"])} className="p-2 cursor-pointer">{hco["Affiliated Account"]}</td>
                  <td className="p-2">{hco["Account Tier"]}</td>
                  <td className="p-2">{hco["Account Archetype"]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AccountLandscape

