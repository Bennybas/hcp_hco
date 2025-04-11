"use client"

import { ArrowLeft, Check, ChevronsUpDown } from "lucide-react"
import { useState, useEffect, useRef, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, LabelList, Cell } from "recharts"
import { useLocation } from "react-router-dom"
import * as d3 from "d3"
import api from "../api/api"
import { PropagateLoader } from "react-spinners";

const HCPdeepDive = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const hcpName = location.state?.hcp_name || "Unknown HCP"
  const [loading, setLoading] = useState(true)
  const [hcpData, setHcpData] = useState([])
  const [hcpDetails, setHcpDetails] = useState({})
  const [quarterlyPatientTrendData, setQuarterlyPatientTrendData] = useState([])
  const [ageData, setAgeData] = useState([])
  const [drugData, setDrugData] = useState([])
  const [scientificData, setScientificData] = useState([])
  const [referralData, setReferralData] = useState([])
  const [allReferralData, setAllReferralData] = useState([])
  const [activeTab, setActiveTab] = useState("all")
  const [hcpNPI, setHcpNPI] = useState("")
  // Add a new state for tracking referral loading
  const [referralLoading, setReferralLoading] = useState(true)

  // Year filter state
  const [availableYears, setAvailableYears] = useState([])
  const [selectedYears, setSelectedYears] = useState([])

  // Specialty filter for referrals
  const [availableSpecialties, setAvailableSpecialties] = useState([])
  const [selectedSpecialties, setSelectedSpecialties] = useState([])
  const [showSpecialtyDropdown, setShowSpecialtyDropdown] = useState(false)

  // Filters for interactive charts
  const [selectedDrug, setSelectedDrug] = useState(null)
  const [selectedAgeGroup, setSelectedAgeGroup] = useState(null)
  const [selectedScientificActivity, setSelectedScientificActivity] = useState(null)

  // Ref for the network graph container
  const networkRef = useRef(null)
  // Ref to track if the graph has been rendered
  const graphRenderedRef = useRef(false)
  // Ref for specialty dropdown
  const specialtyDropdownRef = useRef(null)

  // Filtered data based on year selection
  const filteredHcpData = useMemo(() => {
    if (selectedYears.length === 0) return hcpData
    return hcpData.filter((item) => selectedYears.includes(item.year))
  }, [hcpData, selectedYears])

  // Further filtered data based on interactive selections
  const interactiveFilteredData = useMemo(() => {
    let filtered = [...filteredHcpData]

    if (selectedDrug) {
      filtered = filtered.filter((item) => {
        if (selectedDrug === "Zolgensma") return item.drug_name === "ZOLGENSMA"
        if (selectedDrug === "Spinraza") return item.drug_name === "SPINRAZA"
        if (selectedDrug === "Evrysdi") return item.drug_name === "EVRYSDI"
        return true
      })
    }

    if (selectedAgeGroup) {
      filtered = filtered.filter((item) => {
        if (selectedAgeGroup === "<2") return item.age_group === "0 to 2"
        if (selectedAgeGroup === "2-18") return item.age_group === "3 to 17"
        if (selectedAgeGroup === ">18") return item.age_group === "Above 18"
        return true
      })
    }

    return filtered
  }, [filteredHcpData, selectedDrug, selectedAgeGroup])

  // Filtered referral data based on specialty selection
  const filteredReferralData = useMemo(() => {
    if (selectedSpecialties.length === 0) return referralData
    return referralData.filter((item) => selectedSpecialties.includes(item.specialty))
  }, [referralData, selectedSpecialties])

  // Close specialty dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (specialtyDropdownRef.current && !specialtyDropdownRef.current.contains(event.target)) {
        setShowSpecialtyDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  useEffect(() => {
    const fetchHCPData = async () => {
      try {
        setLoading(true)
        const hcpurl = `${api}/hcp-360?hcp_name=${encodeURIComponent(hcpName)}`
        const response = await fetch(hcpurl)
        const data = await response.json()

        setHcpData(data)

        // Extract available years from data
        const years = [...new Set(data.map((item) => item.year))]
          .filter((year) => year && year !== "2016" && year !== "2025")
          .sort((a, b) => b - a) // Sort in descending order

        setAvailableYears(years)

        processHCPData(data)
      } catch (error) {
        console.error("Error fetching HCP data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchHCPData()
  }, [hcpName])

  // Update processed data when filters change
  useEffect(() => {
    if (interactiveFilteredData.length > 0) {
      processHCPData(interactiveFilteredData)
    }
  }, [interactiveFilteredData])

  // Fetch referral data when NPI is available
  useEffect(() => {
    const fetchReferralData = async () => {
      if (!hcpNPI) return

      try {
        setReferralLoading(true) // Set loading to true when starting fetch
        const referralUrl = `${api}/hcp-360?ref_npi=${hcpNPI}`
        const response = await fetch(referralUrl)
        const data = await response.json()

        // Filter referral data by year if years are selected
        let filteredData = data
        if (selectedYears.length > 0) {
          filteredData = data.filter((item) => selectedYears.includes(item.year))
        }

        processReferralData(filteredData)
      } catch (error) {
        console.error("Error fetching referral data:", error)
      } finally {
        setReferralLoading(false) // Set loading to false when fetch completes
      }
    }

    fetchReferralData()
  }, [hcpNPI, selectedYears]) // Re-fetch when years change

  // Process referral data
  const processReferralData = (data) => {
    if (!data || data.length === 0) {
      setAllReferralData([])
      setReferralData([])
      setAvailableSpecialties([])
      return
    }

    // Group by HCP and count unique patients
    const hcpMap = new Map()

    data.forEach((record) => {
      if (!record.hcp_name) return

      const key = record.hcp_name
      if (!hcpMap.has(key)) {
        hcpMap.set(key, {
          hcpName: record.hcp_name,
          specialty: record.final_spec || "Unknown",
          affiliatedAccount: record.hco_mdm_name || "Unknown",
          patients: new Set(),
          isWithinInstitute: record.hco_mdm_name === hcpDetails.affiliation,
        })
      }

      if (record.patient_id) {
        hcpMap.get(key).patients.add(record.patient_id)
      }
    })

    // Convert to array with patient counts
    const referralArray = Array.from(hcpMap.values()).map((item) => ({
      hcpName: item.hcpName,
      specialty: item.specialty,
      patientsReferred: item.patients.size,
      affiliatedAccount: item.affiliatedAccount,
      isWithinInstitute: item.isWithinInstitute,
    }))

    // Sort by patient count
    referralArray.sort((a, b) => b.patientsReferred - a.patientsReferred)

    // Extract unique specialties for the filter
    const specialties = [...new Set(referralArray.map((item) => item.specialty))]
      .filter((specialty) => specialty !== "Unknown")
      .sort()

    if (!specialties.includes("Unknown") && referralArray.some((item) => item.specialty === "Unknown")) {
      specialties.push("Unknown")
    }

    setAvailableSpecialties(specialties)
    setAllReferralData(referralArray)
    filterReferralData(activeTab, referralArray)
  }

  // Filter referral data based on active tab
  const filterReferralData = (tab, data = allReferralData) => {
    if (tab === "all") {
      setReferralData(data)
    } else if (tab === "within") {
      setReferralData(data.filter((item) => item.isWithinInstitute))
    } else if (tab === "outside") {
      setReferralData(data.filter((item) => !item.isWithinInstitute))
    }
  }

  // Handle tab change
  const handleTabChange = (tab) => {
    if (tab === activeTab) return // Don't rerender if the tab hasn't changed
    setActiveTab(tab)
    filterReferralData(tab)
    // Reset the graph rendered flag when changing tabs
    graphRenderedRef.current = false
  }

  // Handle year selection
  const handleYearToggle = (year) => {
    if (year === "All") {
      setSelectedYears([])
    } else {
      setSelectedYears((prev) => {
        if (prev.includes(year)) {
          return prev.filter((y) => y !== year)
        } else {
          return [...prev, year]
        }
      })
    }
    // Reset the graph rendered flag when changing years
    graphRenderedRef.current = false
  }

  // Handle specialty selection
  const handleSpecialtyToggle = (specialty) => {
    setSelectedSpecialties((prev) => {
      if (prev.includes(specialty)) {
        return prev.filter((s) => s !== specialty)
      } else {
        return [...prev, specialty]
      }
    })
    // Reset the graph rendered flag when changing specialties
    graphRenderedRef.current = false
  }

  // Handle chart item click
  const handleDrugClick = (entry) => {
    if (selectedDrug === entry.category) {
      setSelectedDrug(null)
    } else {
      setSelectedDrug(entry.category)
    }
  }

  const handleAgeClick = (entry) => {
    if (selectedAgeGroup === entry.category) {
      setSelectedAgeGroup(null)
    } else {
      setSelectedAgeGroup(entry.category)
    }
  }

  const handleScientificClick = (entry) => {
    if (selectedScientificActivity === entry.category) {
      setSelectedScientificActivity(null)
    } else {
      setSelectedScientificActivity(entry.category)
    }
  }

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedYears([])
    setSelectedDrug(null)
    setSelectedAgeGroup(null)
    setSelectedScientificActivity(null)
    setSelectedSpecialties([])
  }

  // Effect to render the network graph when referral data changes
  useEffect(() => {
    if (networkRef.current && !graphRenderedRef.current && !referralLoading) {
      renderNetworkGraph()
      graphRenderedRef.current = true
    }
  }, [filteredReferralData, referralLoading])

  const renderNetworkGraph = () => {
    try {
      // Safely clear previous graph
      if (networkRef.current) {
        const container = d3.select(networkRef.current)
        container.selectAll("svg").remove()
      }

      if (filteredReferralData.length === 0) return

      // Set up dimensions
      const width = networkRef.current.clientWidth
      const height = 550
      const margin = { top: 20, right: 300, bottom: 20, left: 150 }
      const innerWidth = width - margin.left - margin.right
      const innerHeight = height - margin.top - margin.bottom

      // Create SVG with zoom functionality
      const svg = d3
        .select(networkRef.current)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .call(
          d3.zoom().on("zoom", (event) => {
            // Apply zoom transformation to the main container group
            mainGroup.attr("transform", event.transform)
          }),
        )
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`)

      // Create a main group that will be transformed during zoom
      const mainGroup = svg.append("g")

      // Create nodes and links for the graph
      const nodes = []
      const links = []

      // Add current HCP as the root node
      const rootNode = {
        id: "root",
        name: hcpDetails.name || hcpName,
        specialty: hcpDetails.specialty || "Unknown",
        type: "current",
        patients: 0,
        x: 0,
        y: innerHeight / 2,
        level: 0,
      }
      nodes.push(rootNode)

      // Group referred HCPs by affiliated account
      const accountGroups = {}
      filteredReferralData.forEach((hcp) => {
        if (!accountGroups[hcp.affiliatedAccount]) {
          accountGroups[hcp.affiliatedAccount] = []
        }
        accountGroups[hcp.affiliatedAccount].push(hcp)
      })

      // Calculate positions for referred HCPs
      const hcpLevel = innerWidth / 3 // Position at 1/3 of the width
      const accountLevel = (innerWidth * 2) / 3 // Position at 2/3 of the width

      // Create a color scale for the HCP-HCO pairs
      const colorScale = d3
        .scaleOrdinal()
        .domain(Object.keys(accountGroups))
        .range([
          "#7ab0eb",
          "#f28e2b",
          "#e15759",
          "#76b7b2",
          "#59a14f",
          "#edc949",
          "#af7aa1",
          "#ff9da7",
          "#9c755f",
          "#bab0ab",
          "#d37295",
          "#a173d1",
          "#6b6ecf",
          "#b5b5b5",
          "#8cd17d",
        ])

      // Add referred HCPs and their affiliated accounts
      const accountNodes = {}
      let hcpIndex = 0

      Object.entries(accountGroups).forEach(([accountName, hcps], accountIndex) => {
        // Get color for this HCP-HCO pair
        const pairColor = colorScale(accountName)

        // Create account node if not exists
        if (!accountNodes[accountName]) {
          const accountNode = {
            id: `account-${accountName.replace(/\s+/g, "-")}`,
            name: accountName,
            type: "account",
            patients: 0,
            x: accountLevel,
            y: 0, // Will be calculated later
            level: 2,
            color: pairColor, // Assign color to account node
          }
          accountNodes[accountName] = accountNode
          nodes.push(accountNode)
        }

        // Add HCP nodes for this account
        hcps.forEach((hcp, i) => {
          const hcpNode = {
            id: `hcp-${hcpIndex}`,
            name: hcp.hcpName,
            specialty: hcp.specialty,
            patients: hcp.patientsReferred,
            type: "referred",
            x: hcpLevel,
            y: 0, // Will be calculated later
            level: 1,
            accountId: accountNodes[accountName].id,
            color: pairColor, // Assign same color as account
          }
          nodes.push(hcpNode)

          // Link from root to HCP
          links.push({
            source: rootNode.id,
            target: hcpNode.id,
            value: hcp.patientsReferred,
            color: pairColor, // Assign color to link
          })

          // Link from HCP to affiliated account
          links.push({
            source: hcpNode.id,
            target: accountNodes[accountName].id,
            value: hcp.patientsReferred,
            color: pairColor, // Assign color to link
          })

          hcpIndex++
        })
      })

      // Calculate y-positions for nodes at each level with increased spacing
      const nodesByLevel = [
        [rootNode], // Level 0 - Current HCP
        nodes.filter((n) => n.level === 1), // Level 1 - Referred HCPs
        nodes.filter((n) => n.level === 2), // Level 2 - Affiliated Accounts
      ]

      // Position nodes at each level with increased vertical spacing
      nodesByLevel.forEach((levelNodes, level) => {
        // Increase padding for referred HCPs (level 1)
        const nodePadding = level === 1 ? 60 : 30

        // Calculate total height needed for this level
        const totalNodesHeight = levelNodes.length * nodePadding

        // Start position - center the group of nodes
        const startY = Math.max(0, (innerHeight - totalNodesHeight) / 2)

        levelNodes.forEach((node, i) => {
          node.y = startY + i * nodePadding
        })
      })

      // Create node-to-node mapping for links
      const nodeMap = {}
      nodes.forEach((node) => {
        nodeMap[node.id] = node
      })

      // Draw links with curved paths
      mainGroup
        .selectAll(".link")
        .data(links)
        .enter()
        .append("path")
        .attr("class", "link")
        .attr("d", (d) => {
          const source = nodeMap[d.source]
          const target = nodeMap[d.target]
          const midX = (source.x + target.x) / 2

          return `M${source.x},${source.y} 
                  C${midX},${source.y} 
                   ${midX},${target.y} 
                   ${target.x},${target.y}`
        })
        .attr("fill", "none")
        .attr("stroke", (d) => d.color || "#ccc") // Use the assigned color
        .attr("stroke-width", (d) => Math.sqrt(d.value) + 1)
        .attr("opacity", 0.7)

      // Draw nodes
      const nodeGroups = mainGroup
        .selectAll(".node")
        .data(nodes)
        .enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", (d) => `translate(${d.x},${d.y})`)

      // Add circles for nodes with different sizes based on type and patient count
      nodeGroups
        .append("circle")
        .attr("r", (d) => {
          if (d.type === "current") return 25
          if (d.type === "referred") return 15 + Math.sqrt(d.patients) * 1.5
          return 12
        })
        .attr("fill", (d) => {
          if (d.type === "current") return "#0b5cab"
          return d.color || "#ccc" // Use the assigned color
        })
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)

      // Add name labels ABOVE the node
      nodeGroups
        .append("text")
        .attr("x", (d) => (d.level === 0 ? -35 : d.level === 2 ? 20 : 0))
        .attr("y", (d) => (d.level === 1 ? -25 : d.level === 0 ? -10 : 0))
        .attr("text-anchor", (d) => (d.level === 0 ? "end" : d.level === 2 ? "start" : "middle"))
        .attr("font-size", "11px")
        .attr("font-weight", "500")
        .attr("fill", "#333")
        .attr("dy", ".35em")
        .text((d) => d.name)

      // Add patient count INSIDE the node for referred HCPs
      nodeGroups
        .filter((d) => d.type === "referred")
        .append("text")
        .attr("x", 0)
        .attr("y", 0)
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("font-weight", "bold")
        .attr("fill", "#fff")
        .attr("dy", ".35em")
        .text((d) => d.patients)

      // Add specialty labels BELOW the node
      nodeGroups
        .filter((d) => d.type === "referred")
        .append("text")
        .attr("x", 0)
        .attr("y", 25)
        .attr("text-anchor", "middle")
        .attr("font-size", "9px")
        .attr("fill", "#555")
        .attr("dy", ".35em")
        .text((d) => d.specialty)

      // Add zoom instructions
      svg
        .append("text")
        .attr("x", width - margin.right - 150)
        .attr("y", height - margin.bottom - 10)
        .attr("text-anchor", "end")
        .attr("font-size", "10px")
        .attr("fill", "#666")
        .text("Use mouse wheel to zoom, drag to pan")
    } catch (error) {
      console.error("Error rendering network graph:", error)
    }
  }

  const processHCPData = (data) => {
    if (data && data.length > 0) {
      // Extract HCP Details
      const firstRecord = data[0]
      setHcpDetails({
        name: firstRecord.hcp_name,
        specialty: firstRecord.final_spec,
        npi: firstRecord.hcp_id,
        tier: firstRecord.hcp_segment,
        affiliation: firstRecord.hco_mdm_name,
        zolgensmaUser: firstRecord.zolg_prescriber,
        nvsTarget: firstRecord.zolgensma_iv_target,
        kol: firstRecord.kol,
        address: firstRecord.address,
      })

      // Set HCP NPI for referral data fetching
      setHcpNPI(firstRecord.hcp_id)

      // Process data by year and quarter for the stacked bar chart
      const yearQuarterData = {}

      // Group data by year and quarter
      data.forEach((record) => {
        if (record.year && record.quarter && record.drug_name && record.patient_id) {
          // Skip 2016 and 2025 data
          if (record.year === "2016" || record.year === "2025") return

          const year = record.year
          const quarter = record.quarter
          const key = `${year}-Q${quarter}`

          if (!yearQuarterData[key]) {
            yearQuarterData[key] = {
              yearQuarter: key,
              year: year,
              quarter: `Q${quarter}`,
              Zolgensma: 0,
              Spinraza: 0,
              Evrysdi: 0,
              total: 0,
            }
          }

          // Increment the appropriate drug count
          if (record.drug_name === "ZOLGENSMA") {
            yearQuarterData[key].Zolgensma += 1
            yearQuarterData[key].total += 1
          } else if (record.drug_name === "SPINRAZA") {
            yearQuarterData[key].Spinraza += 1
            yearQuarterData[key].total += 1
          } else if (record.drug_name === "EVRYSDI") {
            yearQuarterData[key].Evrysdi += 1
            yearQuarterData[key].total += 1
          }
        }
      })

      // If no data is available, create sample data
      if (Object.keys(yearQuarterData).length === 0) {
        // Create sample data for the last 8 quarters, excluding 2016 and 2025
        const years = ["2022", "2023", "2024"]
        const quarters = ["1", "2", "3", "4"]

        years.forEach((year) => {
          quarters.forEach((quarter) => {
            const key = `${year}-Q${quarter}`
            yearQuarterData[key] = {
              yearQuarter: key,
              year: year,
              quarter: `Q${quarter}`,
              Zolgensma: Math.floor(Math.random() * 5),
              Spinraza: Math.floor(Math.random() * 8),
              Evrysdi: Math.floor(Math.random() * 6),
              total: 0,
            }

            // Calculate total
            yearQuarterData[key].total =
              yearQuarterData[key].Zolgensma + yearQuarterData[key].Spinraza + yearQuarterData[key].Evrysdi
          })
        })
      }

      // Convert to array and sort by year and quarter
      const formattedData = Object.values(yearQuarterData).sort((a, b) => {
        if (a.year !== b.year) {
          return a.year - b.year
        }
        return a.quarter.substring(1) - b.quarter.substring(1)
      })

      // Add yearLabel property for the chart
      const processedYears = new Set()
      formattedData.forEach((item) => {
        if (!processedYears.has(item.year)) {
          item.yearLabel = item.year
          processedYears.add(item.year)
        } else {
          item.yearLabel = ""
        }
      })

      setQuarterlyPatientTrendData(formattedData)

      // Age Data - using age_group field from the data
      const ageGroups = { "<2": 0, "2-18": 0, ">18": 0 }

      data.forEach((record) => {
        if (record.age_group === "0 to 2") {
          ageGroups["<2"] += 1
        } else if (record.age_group === "3 to 17") {
          ageGroups["2-18"] += 1
        } else if (record.age_group === "Above 18") {
          ageGroups[">18"] += 1
        }
      })

      setAgeData(
        Object.keys(ageGroups).map((category) => ({
          category,
          value: ageGroups[category],
        })),
      )

      // Drug Data
      const drugs = { Zolgensma: 0, Spinraza: 0, Evrysdi: 0 }
      data.forEach((record) => {
        if (record.drug_name === "ZOLGENSMA") drugs["Zolgensma"] += 1
        else if (record.drug_name === "SPINRAZA") drugs["Spinraza"] += 1
        else if (record.drug_name === "EVRYSDI") drugs["Evrysdi"] += 1
      })

      setDrugData(
        Object.keys(drugs).map((category) => ({
          category,
          value: drugs[category],
        })),
      )

      const scientificValues = {
        Publications: null,
        "Clinical Trials": null,
        Congress: null,
      }

      // Find first valid publications value
      for (const record of data) {
        if (record.publications && record.publications !== "null" && record.publications.trim() !== "") {
          scientificValues.Publications = Number.parseInt(record.publications, 10)
          break
        }
      }

      // Find first valid clinical trials value
      for (const record of data) {
        if (record.clinical_trials && record.clinical_trials !== "null" && record.clinical_trials.trim() !== "") {
          scientificValues["Clinical Trials"] = Number.parseInt(record.clinical_trials, 10)
          break
        }
      }

      // Find first valid congress contributions value
      for (const record of data) {
        if (
          record.congress_contributions &&
          record.congress_contributions !== "null" &&
          record.congress_contributions.trim() !== ""
        ) {
          scientificValues.Congress = Number.parseInt(record.congress_contributions, 10)
          break
        }
      }

      // Set default value of 0 for any null values
      Object.keys(scientificValues).forEach((key) => {
        if (scientificValues[key] === null) {
          scientificValues[key] = 0
        }
      })

      // Format data for the chart
      setScientificData(
        Object.keys(scientificValues).map((category) => ({
          category,
          value: scientificValues[category],
        })),
      )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
          <PropagateLoader color="#0460A9" size={10} />
      </div>
    )
  }

  return (
    <div className="p-4 bg-gray-100">
      {/* Back Button and Year Filter */}
      <div className="flex w-full justify-between mb-4">
        <button onClick={() => navigate("/")} className="flex gap-2 py-2 px-1 items-center justify-start">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
          <span className="text-gray-700 text-[12px]">Back</span>
        </button>

        {/* Year filter as pill buttons */}
        <div className="flex items-center gap-2 bg-white rounded-full shadow-sm p-1">
          {/* <div className="flex items-center mr-2">
            <span className="text-gray-600 text-[12px]">Year:</span>
          </div> */}

          <button
            className={`px-4 py-1 rounded-full text-[12px] transition-colors ${
              selectedYears.length === 0 ? "bg-[#0460A9] text-white" : "bg-gray-200 text-gray-700"
            }`}
            onClick={() => handleYearToggle("All")}
          >
            All
          </button>

          {availableYears.map((year) => (
            <button
              key={year}
              className={`px-4 py-1 rounded-full text-[12px] transition-colors ${
                selectedYears.includes(year) ? "bg-[#0460A9] text-white" : "bg-gray-200 text-gray-700"
              }`}
              onClick={() => handleYearToggle(year)}
            >
              {year}
            </button>
          ))}

          {(selectedYears.length > 0 ||
            selectedDrug ||
            selectedAgeGroup ||
            selectedScientificActivity ||
            selectedSpecialties.length > 0) && (
            <button
              onClick={clearAllFilters}
              className="ml-2 text-[11px] text-blue-600 bg-blue-50 px-2 py-1 rounded-full hover:bg-blue-100"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Layout */}
      <div className="w-full flex gap-4">
        {/* Left Section (20% width) */}
        <div className="w-[20%] h-screen bg-white rounded-2xl relative">
          {/* Background Image (HCP-HCO) */}
          <img src="hcp-hco.jpg" alt="hcp-hco" className="h-16 w-full rounded-t-2xl" />

          <div className="absolute -mt-8 ml-3 bg-white rounded-full h-20 w-20 border broder-[#D2D2D2] p-2 items-center justify-center flex">
            <img src="doctor_stethoscope.svg" alt="img" className="h-8 w-8" />
          </div>

          {/* HCP Details */}
          <div className="mt-12 p-4">
            <span className="text-[14px] font-semibold text-gray-900">{hcpDetails.name || "Haylie Ross"}</span>
            <span className="text-[10px] text-gray-500 block">{hcpDetails.specialty || "Child Neurologist"}</span>
            <hr className="border-gray-300 w-full my-2" />

            {/* NPI & Cluster */}
            <div className="flex justify-between w-full text-[10px] text-gray-600">
              <span>NPI</span>
              <span>HCP Tier/Cluster</span>
            </div>
            <div className="flex justify-between w-full text-[12px] font-semibold text-gray-900">
              <span>{hcpDetails.npi || "12165854"}</span>
              <span>{hcpDetails.tier || "High"}</span>
            </div>
            <hr className="border-gray-300 w-full my-2" />

            {/* Affiliation */}
            <div className="text-[10px] text-gray-600">Affiliation</div>
            <div className="text-[12px] font-semibold text-gray-900">
              {hcpDetails.affiliation || "LE BONHEUR CHILDRENS HOSPITAL"}
            </div>
            <hr className="border-gray-300 w-full my-2" />

            {/* Other Details */}
            <div className="w-full">
              <div className="text-[10px] text-gray-600">Zolgensma Prescriber</div>
              <div className="text-[12px] font-semibold text-gray-900">{hcpDetails.zolgensmaUser || "Yes"}</div>
              <hr className="border-gray-300 w-full my-2" />
            </div>
            <div className="w-full">
              <div className="text-[10px] text-gray-600">NVS Target</div>
              <div className="text-[12px] font-semibold text-gray-900">{hcpDetails.nvsTarget || "Yes"}</div>
              <hr className="border-gray-300 w-full my-2" />
            </div>
            <div className="w-full">
              <div className="text-[10px] text-gray-600">KOL</div>
              <div className="text-[12px] font-semibold text-gray-900">{hcpDetails.kol || "Yes"}</div>
              <hr className="border-gray-300 w-full my-2" />
            </div>

            {/* Address */}
            <div className="text-[10px] text-gray-600">Address</div>
            <div className="text-[12px] font-semibold text-gray-900 leading-tight">
              {hcpDetails.address || "2583 S VOLUSIA AVE, STE 300, FL, 32763"}
            </div>
          </div>
        </div>

        {/* Right Section (80% width) */}
        <div className="w-[80%] h-screen bg-white rounded-2xl overflow-y-auto">
          <div className="flex flex-col gap-4 p-4">
            <div className="flex flex-col w-full h-56 p-2">
              <div className="flex w-full items-center justify-between">
                <span className="text-gray-700 text-[11px] font-[500] pb-4">#Treated Patients</span>
                <div className="flex items-center justify-end gap-2">
                  <div className="flex items-center gap-1">
                    <div className="bg-[#8E58B3] rounded-full w-2 h-2"></div>
                    <span className="text-gray-700 text-[9px]">Zolgensma</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="bg-[#2A9FB0] rounded-full w-2 h-2"></div>
                    <span className="text-gray-700 text-[9px]">Spinraza</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="bg-[#D50057] rounded-full w-2 h-2"></div>
                    <span className="text-gray-700 text-[9px]">Evrysdi</span>
                  </div>
                </div>
              </div>

              <ResponsiveContainer width="100%" height="90%" style={{ marginLeft: -10 }}>
                <BarChart data={quarterlyPatientTrendData} margin={{ top: 20, left: -20, bottom: 5 }}>
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
                  <Tooltip
                    formatter={(value) => `${value}`}
                    labelStyle={{ fontSize: 11 }}
                    itemStyle={{ fontSize: 10 }}
                  />
                  <Bar
                    dataKey="Zolgensma"
                    stackId="a"
                    fill={selectedDrug === "Zolgensma" ? "#6a3d81" : "#8E58B3"}
                    cursor="pointer"
                    onClick={(data) => handleDrugClick({ category: "Zolgensma" })}
                  />
                  <Bar
                    dataKey="Spinraza"
                    stackId="a"
                    fill={selectedDrug === "Spinraza" ? "#1c6f7c" : "#2A9FB0"}
                    cursor="pointer"
                    onClick={(data) => handleDrugClick({ category: "Spinraza" })}
                  />
                  <Bar
                    dataKey="Evrysdi"
                    stackId="a"
                    fill={selectedDrug === "Evrysdi" ? "#9c003f" : "#D50057"}
                    cursor="pointer"
                    onClick={(data) => handleDrugClick({ category: "Evrysdi" })}
                  >
                    <LabelList dataKey="total" position="top" fontSize={9} fill="#333" fontWeight="15px" offset={5} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <hr className="border-gray-300 w-full my-2" />
            </div>

            <div className="flex gap-2 w-full ">
              <div className="w-full md:w-1/3 p-4 ">
                <h2 className="text-gray-700 text-[11px] font-[500] pb-4">#Patients by Age</h2>
                <div className="-ml-8">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={ageData}>
                      <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: 10 }} itemStyle={{ fontSize: 10 }} />
                      <Bar
                        dataKey="value"
                        barSize={40}
                        radius={[6, 6, 0, 0]}
                        cursor="pointer"
                        onClick={(data) => handleAgeClick(data)}
                      >
                        {ageData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={selectedAgeGroup === entry.category ? "#1e5a8d" : "#3680ba"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="border-l border-gray-300 h-[14rem] mx-2"></div>

              <div className="w-full md:w-1/3 p-4 ">
                <h2 className="text-gray-700 text-[11px] font-[500] pb-4">#Patients by Drug</h2>
                <div className="-ml-8">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={drugData}>
                      <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: 10 }} itemStyle={{ fontSize: 10 }} />
                      <Bar
                        dataKey="value"
                        barSize={40}
                        radius={[6, 6, 0, 0]}
                        cursor="pointer"
                        onClick={(data) => handleDrugClick(data)}
                      >
                        {drugData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={selectedDrug === entry.category ? "#1e5a8d" : "#3680ba"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="border-l border-gray-300 h-[14rem] mx-2"></div>
              <div className="w-full md:w-1/3 p-4 ">
                <h2 className="text-gray-700 text-[11px] font-[500] pb-4">#Scientific Activities Engagement</h2>
                <div className="-ml-8">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={scientificData}>
                      <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: 10 }} itemStyle={{ fontSize: 10 }} />
                      <Bar
                        dataKey="value"
                        barSize={40}
                        radius={[6, 6, 0, 0]}
                        cursor="pointer"
                        onClick={(data) => handleScientificClick(data)}
                      >
                        {scientificData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={selectedScientificActivity === entry.category ? "#1e5a8d" : "#3680ba"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <hr className="border-gray-300 w-full -mt-6" />

            <div className="p-4">
              <div className="flex flex-wrap gap-2 items-center py-2">
                <div className="text-gray-700 text-[11px] font-medium">Patients Referral</div>

                <div className="flex space-x-2">
                  <button
                    className={`px-4 py-2 rounded-full text-[10px] ${activeTab === "all" ? "bg-[#3680ba] text-white" : "bg-gray-200 text-gray-700"}`}
                    onClick={() => handleTabChange("all")}
                  >
                    All Referrals
                  </button>
                  <button
                    className={`px-4 py-2 rounded-full text-[10px] ${activeTab === "within" ? "bg-[#3680ba] text-white" : "bg-gray-200 text-gray-700"}`}
                    onClick={() => handleTabChange("within")}
                  >
                    Within Institute
                  </button>
                  <button
                    className={`px-4 py-2 rounded-full text-[10px] ${activeTab === "outside" ? "bg-[#3680ba] text-white" : "bg-gray-200 text-gray-700"}`}
                    onClick={() => handleTabChange("outside")}
                  >
                    Outside Institute
                  </button>
                </div>

                {/* Specialty Filter Dropdown */}
                <div className="relative ml-auto" ref={specialtyDropdownRef}>
                  <button
                    className="flex items-center justify-between w-48 px-3 py-2 text-[10px] bg-white border rounded-md shadow-sm hover:bg-gray-50"
                    onClick={() => setShowSpecialtyDropdown(!showSpecialtyDropdown)}
                  >
                    <span>
                      {selectedSpecialties.length === 0
                        ? "Filter by Specialty"
                        : `${selectedSpecialties.length} specialties selected`}
                    </span>
                    <ChevronsUpDown className="w-4 h-4 ml-2 opacity-50" />
                  </button>
                  {showSpecialtyDropdown && (
                    <div className="absolute right-0 z-10 w-48 mt-1 bg-white border rounded-md shadow-lg">
                      <div className="p-2 max-h-60 overflow-auto">
                        {availableSpecialties.map((specialty) => (
                          <div
                            key={specialty}
                            className="flex items-center px-2 py-1 text-[10px] hover:bg-gray-100 cursor-pointer"
                            onClick={() => handleSpecialtyToggle(specialty)}
                          >
                            <div
                              className={`w-4 h-4 mr-2 border rounded flex items-center justify-center ${
                                selectedSpecialties.includes(specialty)
                                  ? "bg-blue-500 border-blue-500"
                                  : "border-gray-300"
                              }`}
                            >
                              {selectedSpecialties.includes(specialty) && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span>{specialty}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Network Graph Container */}
              <div
                ref={networkRef}
                className="w-full h-[550px] border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden"
              >
                {referralLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : filteredReferralData.length === 0 ? (
                  <div className="flex justify-center items-center h-full text-gray-500 text-sm">
                    No referral data available
                  </div>
                ) : null}
              </div>

              {/* Legend for the network graph */}
              <div className="flex items-center justify-start gap-6 mt-4 px-2">
                <div className="flex items-center gap-2">
                  <div className="bg-[#0b5cab] rounded-full w-4 h-4"></div>
                  <span className="text-gray-700 text-[11px]">Current HCP</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-700 text-[11px]">
                    Referred HCPs & Affiliated Accounts (colored by pair)
                  </span>
                </div>
              </div>

              {/* Instructions */}
              <div className="text-gray-500 text-[10px] mt-2 px-2">
                <p>* Node size indicates number of patients referred</p>
                <p>* Patient count is shown inside the node</p>
                <p>* Use mouse wheel to zoom, drag to pan</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HCPdeepDive
