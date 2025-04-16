"use client"

import { ArrowLeft } from "lucide-react"
import { useState, useEffect, useRef, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  Legend,
  LabelList,
} from "recharts"
import { useLocation } from "react-router-dom"
import * as d3 from "d3"
import api from "../api/api"
import { PropagateLoader } from "react-spinners";

const HCOdeepDive = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const hcoMdm = location.state?.hco_id || "Unknown HCO"
  const [loading, setLoading] = useState(true)
  const [hcoData, setHcoData] = useState([])
  const [hcoDetails, setHcoDetails] = useState({})
  const [quarterlyPatientTrendData, setQuarterlyPatientTrendData] = useState([])
  const [ageData, setAgeData] = useState([])
  const [drugData, setDrugData] = useState([])
  const [specialtyData, setSpecialtyData] = useState([])
  const [affiliatedHcpsData, setAffiliatedHcpsData] = useState([])
  const [referralData, setReferralData] = useState([])
  const [allReferralData, setAllReferralData] = useState([])
  const [activeTab, setActiveTab] = useState("all")

  // Table pagination state
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  // Loading states
  const [tableLoading, setTableLoading] = useState(true)
  const [referralLoading, setReferralLoading] = useState(true)

  // Year filter state
  const [availableYears, setAvailableYears] = useState([])
  const [selectedYears, setSelectedYears] = useState([])

  // Filters for interactive charts
  const [selectedDrug, setSelectedDrug] = useState(null)
  const [selectedAgeGroup, setSelectedAgeGroup] = useState(null)
  const [selectedSpecialty, setSelectedSpecialty] = useState(null)
  const [selectedHcp, setSelectedHcp] = useState(null)

  // Ref for the network graph container
  const networkRef = useRef(null)
  // Ref to track if the graph has been rendered
  const graphRenderedRef = useRef(false)

  // Filtered data based on year selection
  const filteredHcoData = useMemo(() => {
    if (selectedYears.length === 0) return hcoData
    return hcoData.filter((item) => selectedYears.includes(item.year))
  }, [hcoData, selectedYears])

  // Further filtered data based on interactive selections
  const interactiveFilteredData = useMemo(() => {
    let filtered = [...filteredHcoData]

    if (selectedDrug) {
      filtered = filtered.filter((item) => item.drug_name === selectedDrug)
    }

    if (selectedAgeGroup) {
      filtered = filtered.filter((item) => {
        if (selectedAgeGroup === "<2") return item.age_group === "0 to 2"
        if (selectedAgeGroup === "2-18") return item.age_group === "3 to 17"
        if (selectedAgeGroup === ">18") return item.age_group === "Above 18"
        return true
      })
    }

    if (selectedSpecialty) {
      filtered = filtered.filter((item) => item.final_spec === selectedSpecialty)
    }

    if (selectedHcp) {
      filtered = filtered.filter((item) => item.hcp_name === selectedHcp)
    }

    return filtered
  }, [filteredHcoData, selectedDrug, selectedAgeGroup, selectedSpecialty, selectedHcp])

  useEffect(() => {
    const fetchHCOData = async () => {
      try {
        setLoading(true)
        setTableLoading(true)
        setReferralLoading(true)

        const hcoUrl = `${api}/hco-360?hco_mdm=${encodeURIComponent(hcoMdm)}`
        const response = await fetch(hcoUrl)
        const data = await response.json()

        setHcoData(data)

        // Extract available years from data
        const years = [...new Set(data.map((item) => item.year))]
          .filter((year) => year && year !== "2016" && year !== "2025")
          .sort((a, b) => b - a) // Sort in descending order

        setAvailableYears(years)

        processHCOData(data)

        // Fetch referral data separately
        fetchReferralData()
      } catch (error) {
        console.error("Error fetching HCO data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchHCOData()
  }, [hcoMdm])

  // Fetch referral data when years change
  const fetchReferralData = async () => {
    try {
      setReferralLoading(true)
      const referralUrl = `${api}/hco-360?ref_hco_npi_mdm=${encodeURIComponent(hcoMdm)}`
      const referralResponse = await fetch(referralUrl)
      let referralData = await referralResponse.json()

      // Filter referral data by year if years are selected
      if (selectedYears.length > 0) {
        referralData = referralData.filter((item) => selectedYears.includes(item.year))
      }

      processReferralData(referralData)
    } catch (error) {
      console.error("Error fetching referral data:", error)
      setReferralLoading(false)
    }
  }

  // Update processed data when filters change
  useEffect(() => {
    if (interactiveFilteredData.length > 0) {
      processHCOData(interactiveFilteredData)
    }
  }, [interactiveFilteredData])

  // Re-fetch referral data when years change
  useEffect(() => {
    fetchReferralData()
    // Reset the graph rendered flag when changing years
    graphRenderedRef.current = false
  }, [selectedYears])

  const processHCOData = (data) => {
    if (data && data.length > 0) {
      // Extract HCO Details from first record
      const firstRecord = data[0]
      setHcoDetails({
        name: firstRecord.hco_mdm_name,
        setting: firstRecord.account_setting_type,
        grouping: firstRecord.hco_grouping,
        address: firstRecord.address,
        // Add any other HCO-specific details you need
      })

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
      const agePatients = { "<2": new Set(), "2-18": new Set(), ">18": new Set() }

      data.forEach((record) => {
        if (!record.patient_id) return

        if (record.age_group === "0 to 2") {
          agePatients["<2"].add(record.patient_id)
        } else if (record.age_group === "3 to 17") {
          agePatients["2-18"].add(record.patient_id)
        } else if (record.age_group === "Above 18") {
          agePatients[">18"].add(record.patient_id)
        }
      })

      // Update age groups with unique patient counts
      Object.keys(agePatients).forEach((key) => {
        ageGroups[key] = agePatients[key].size
      })

      setAgeData(
        Object.keys(ageGroups).map((category) => ({
          category,
          value: ageGroups[category],
        })),
      )

      // Drug Data - count unique patients per drug
      const drugs = { Zolgensma: new Set(), Spinraza: new Set(), Evrysdi: new Set() }

      data.forEach((record) => {
        if (!record.patient_id) return

        if (record.drug_name === "ZOLGENSMA") {
          drugs.Zolgensma.add(record.patient_id)
        } else if (record.drug_name === "SPINRAZA") {
          drugs.Spinraza.add(record.patient_id)
        } else if (record.drug_name === "EVRYSDI") {
          drugs.Evrysdi.add(record.patient_id)
        }
      })

      setDrugData(
        Object.keys(drugs).map((category) => ({
          category,
          value: drugs[category].size,
        })),
      )

      // Process HCPs by Specialty data for pie chart
      const specialties = {}
      const specialtyHcps = {}

      data.forEach((record) => {
        if (!record.hcp_id || !record.final_spec) return

        const specialty = record.final_spec.toUpperCase()

        if (!specialtyHcps[specialty]) {
          specialtyHcps[specialty] = new Set()
        }

        specialtyHcps[specialty].add(record.hcp_id)
      })

      // Convert to array for pie chart
      const specialtyArray = Object.keys(specialtyHcps).map((specialty) => ({
        name: specialty,
        value: specialtyHcps[specialty].size,
      }))

      // Sort by count and assign colors
      specialtyArray.sort((a, b) => b.value - a.value)

      const colors = [
        "#00599D",
        "#6A99B5",
        "#7DFFA8",
        "#F0C3F7",
        "#C8E3F5",
        "#82CA9D",
        "#A4DE6C",
        "#D0ED57",
        "#FAD000",
        "#F28E2B",
      ]

      specialtyArray.forEach((item, index) => {
        item.color = colors[index % colors.length]
      })

      setSpecialtyData(specialtyArray)

      // Process Affiliated HCPs data
      const hcpMap = new Map()

      data.forEach((record) => {
        if (!record.hcp_id || !record.hcp_name) return

        const hcpId = record.hcp_id

        if (!hcpMap.has(hcpId)) {
          hcpMap.set(hcpId, {
            hcpName: record.hcp_name,
            hcpPotential: record.hcp_segment || "Unknown",
            specialty: record.final_spec || "Unknown",
            patients: new Set(),
            zolgensmaPatients: new Set(),
            spinrazaPatients: new Set(),
            evrysdiPatients: new Set(),
          })
        }

        if (record.patient_id) {
          hcpMap.get(hcpId).patients.add(record.patient_id)

          if (record.drug_name === "ZOLGENSMA") {
            hcpMap.get(hcpId).zolgensmaPatients.add(record.patient_id)
          } else if (record.drug_name === "SPINRAZA") {
            hcpMap.get(hcpId).spinrazaPatients.add(record.patient_id)
          } else if (record.drug_name === "EVRYSDI") {
            hcpMap.get(hcpId).evrysdiPatients.add(record.patient_id)
          }
        }
      })

      // Convert to array and calculate counts
      const affiliatedHcps = Array.from(hcpMap.values()).map((hcp) => ({
        hcpName: hcp.hcpName,
        hcpPotential: hcp.hcpPotential,
        specialty: hcp.specialty,
        patientCount: hcp.patients.size,
        zolgensmaPatientCount: hcp.zolgensmaPatients.size,
        spinrazaPatientCount: hcp.spinrazaPatients.size,
        evrysdiPatientCount: hcp.evrysdiPatients.size,
      }))

      // Sort by patient count
      affiliatedHcps.sort((a, b) => b.patientCount - a.patientCount)

      setAffiliatedHcpsData(affiliatedHcps)
      setTableLoading(false)
    }
  }

  // The processReferralData function needs to be updated to use the hco_mdm_name field correctly
  const processReferralData = (data) => {
    if (!data || data.length === 0) {
      setAllReferralData([])
      filterReferralData("all", [])
      setReferralLoading(false)
      return
    }

    // Group by referring organization to get unique referring HCOs
    const referralMap = new Map()

    data.forEach((record) => {
      // Get the referring organization name from hco_mdm_name as requested
      const refOrgName = record.hco_mdm_name || "Unknown Organization"

      // Skip if the referring organization is missing or "-"
      if (refOrgName === "-") return

      // Get the within/outside status directly from the API field
      const withinOutsideStatus = record.within_outside_hco_referral || "UNSPECIFIED"

      // Determine if this is within or outside based on the field value
      const isWithinInstitute = withinOutsideStatus === "WITHIN"

      // Skip UNSPECIFIED if filtering by within/outside
      if (withinOutsideStatus === "UNSPECIFIED" && activeTab !== "all") return

      const key = refOrgName

      if (!referralMap.has(key)) {
        referralMap.set(key, {
          accountName: refOrgName,
          patients: new Set(),
          isWithinInstitute: isWithinInstitute,
          withinOutsideStatus: withinOutsideStatus,
        })
      }

      // Add patient ID to the set if it exists
      if (record.patient_id) {
        referralMap.get(key).patients.add(record.patient_id)
      }
    })

    // Convert to array with patient counts
    const referralArray = Array.from(referralMap.values()).map((item) => ({
      accountName: item.accountName,
      patientCount: item.patients.size,
      isWithinInstitute: item.isWithinInstitute,
      withinOutsideStatus: item.withinOutsideStatus,
    }))

    // Sort by patient count
    referralArray.sort((a, b) => b.patientCount - a.patientCount)

    setAllReferralData(referralArray)
    filterReferralData(activeTab, referralArray)
    setReferralLoading(false)
  }

  // Filter referral data based on active tab
  const filterReferralData = (tab, data = allReferralData) => {
    if (tab === "all") {
      setReferralData(data)
    } else if (tab === "within") {
      setReferralData(data.filter((item) => item.isWithinInstitute))
    } else if (tab === "outside") {
      setReferralData(data.filter((item) => !item.isWithinInstitute && item.withinOutsideStatus !== "UNSPECIFIED"))
    }
  }

  // Handle tab change
  const handleTabChange = (tab) => {
    if (tab === activeTab) return // Don't rerender if the tab hasn't changed
    setActiveTab(tab)
    setReferralLoading(true)

    // Short delay to show loading state
    setTimeout(() => {
      filterReferralData(tab)
      setReferralLoading(false)
      // Reset the graph rendered flag when changing tabs
      graphRenderedRef.current = false
    }, 500)
  }

  // Handle rows per page change
  const handleRowsPerPageChange = (newRowsPerPage) => {
    setRowsPerPage(newRowsPerPage)
    setCurrentPage(1) // Reset to first page when changing rows per page
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
  }

  // Handle chart item click
  const handleDrugClick = (entry) => {
    const drugMap = {
      Zolgensma: "ZOLGENSMA",
      Spinraza: "SPINRAZA",
      Evrysdi: "EVRYSDI",
    }

    if (selectedDrug === drugMap[entry.category]) {
      setSelectedDrug(null)
    } else {
      setSelectedDrug(drugMap[entry.category])
    }
  }

  const handleAgeClick = (entry) => {
    if (selectedAgeGroup === entry.category) {
      setSelectedAgeGroup(null)
    } else {
      setSelectedAgeGroup(entry.category)
    }
  }

  const handleSpecialtyClick = (entry) => {
    if (selectedSpecialty === entry.name) {
      setSelectedSpecialty(null)
    } else {
      setSelectedSpecialty(entry.name)
    }
  }

  const handleHcpClick = (hcpName) => {
    if (selectedHcp === hcpName) {
      setSelectedHcp(null)
    } else {
      setSelectedHcp(hcpName)
    }
  }

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedYears([])
    setSelectedDrug(null)
    setSelectedAgeGroup(null)
    setSelectedSpecialty(null)
    setSelectedHcp(null)
  }

  // Calculate pagination for table
  const paginatedHcpsData = affiliatedHcpsData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  const totalPages = Math.ceil(affiliatedHcpsData.length / rowsPerPage)

  // Effect to render the network graph when referral data changes
  useEffect(() => {
    if (networkRef.current && !graphRenderedRef.current && !referralLoading) {
      renderNetworkGraph()
      graphRenderedRef.current = true
    }
  }, [referralData, referralLoading])

  // Updated renderNetworkGraph function that simplifies the visualization
  const renderNetworkGraph = () => {
    try {
      // Safely clear previous graph
      if (networkRef.current) {
        const container = d3.select(networkRef.current)
        container.selectAll("svg").remove()
      }

      if (referralData.length === 0) return

      // Set up dimensions
      const width = networkRef.current.clientWidth
      const height = 450
      const margin = { top: 20, right: 150, bottom: 20, left: 150 }
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

      // Add current HCO as the root node
      const rootNode = {
        id: "root",
        name: hcoDetails.name || "Current HCO",
        type: "current",
        level: 0,
        x: 0,
        y: innerHeight / 2,
      }
      nodes.push(rootNode)

      // Color scale for referred HCOs
      const colorScale = d3
        .scaleOrdinal()
        .domain(referralData.map((d) => d.accountName))
        .range([
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
        ])

      // Add referred HCO nodes directly connected to the root
      referralData.forEach((referral, index) => {
        const referredNode = {
          id: `referred-${index}`,
          name: referral.accountName,
          type: "referred",
          level: 1,
          patients: referral.patientCount,
          color: colorScale(referral.accountName),
          isWithin: referral.isWithinInstitute,
          withinOutsideStatus: referral.withinOutsideStatus,
          x: innerWidth * 0.7, // Position at 70% of the width
          y: 0, // Will be calculated later
        }
        nodes.push(referredNode)

        // Link from root to referred HCO
        links.push({
          source: rootNode.id,
          target: referredNode.id,
          value: referral.patientCount,
          isWithin: referral.isWithinInstitute,
          withinOutsideStatus: referral.withinOutsideStatus,
        })
      })

      // Calculate y-positions for referred HCO nodes with increased spacing
      const referredNodes = nodes.filter((n) => n.level === 1)

      // Increase vertical spacing between nodes
      const nodePadding = 50

      // Calculate total height needed
      const totalNodesHeight = referredNodes.length * nodePadding

      // Start position - center the group of nodes
      const startY = Math.max(0, (innerHeight - totalNodesHeight) / 2)

      referredNodes.forEach((node, i) => {
        node.y = startY + i * nodePadding
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
        .attr("stroke", (d) => {
          const target = nodeMap[d.target]
          return target.color || "#ccc"
        })
        .attr("stroke-width", (d) => Math.sqrt(d.value) + 1)
        .attr("opacity", 0.7)
        .attr("stroke-dasharray", (d) => {
          // Use dashed lines for outside, solid for within
          if (d.withinOutsideStatus === "WITHIN") return "none"
          if (d.withinOutsideStatus === "OUTSIDE") return "5,5"
          return "3,3" // Default for UNSPECIFIED
        })

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
          // Scale referred HCO nodes based on patient count
          if (d.type === "referred") return 10 + Math.sqrt(d.patients || 1) * 2
          return 10
        })
        .attr("fill", (d) => {
          if (d.type === "current") return "#0b5cab"
          if (d.type === "referred") return d.color
          return "#ccc"
        })
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)

      // Add patient count inside the node for referred HCOs
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

      // Add text labels for node names
      nodeGroups
        .append("text")
        .attr("x", (d) => (d.level === 0 ? -35 : 20))
        .attr("y", (d) => 0)
        .attr("text-anchor", (d) => (d.level === 0 ? "end" : "start"))
        .attr("font-size", "11px")
        .attr("font-weight", "500")
        .attr("fill", "#333")
        .attr("dy", ".35em")
        .text((d) => d.name)

      // Add within/outside indicator for referred HCO nodes
      nodeGroups
        .filter((d) => d.type === "referred")
        .append("text")
        .attr("x", 20)
        .attr("y", 15)
        .attr("text-anchor", "start")
        .attr("font-size", "9px")
        .attr("fill", "#555")
        .text((d) => {
          let status = ""
          if (d.withinOutsideStatus === "WITHIN") status = "Within"
          else if (d.withinOutsideStatus === "OUTSIDE") status = "Outside"
          else status = "Unspecified"

          return status
        })

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
          <PropagateLoader color="#0460A9" size={10} />
      </div>
    )
  }

  const getHCPDetails = (hcpName) => {
    navigate("/hcp", { state: { hcp_name: hcpName } })
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

          {(selectedYears.length > 0 || selectedDrug || selectedAgeGroup || selectedSpecialty || selectedHcp) && (
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

          <div className="absolute -mt-8 ml-3">
            <img src="hco.png" alt="img" className="h-20 w-20 rounded-full" />
          </div>

          {/* HCO Details */}
          <div className="mt-12 p-4">
            <span className="text-[14px] font-semibold text-gray-900">{hcoDetails.name || "Unknown HCO"}</span>
            <span className="text-[10px] text-gray-500 block">Healthcare Organization</span>
            <hr className="border-gray-300 w-full my-2" />

            {/* HCO ID & Tier */}
            <div className="flex justify-between w-full text-[10px] text-gray-600">
              <span>HCO MDM</span>
              <span>Account Setting</span>
            </div>
            <div className="flex justify-between w-full text-[12px] font-semibold text-gray-900">
              <span>{hcoMdm}</span>
              <span>{hcoDetails.setting || "Unknown"}</span>
            </div>
            <hr className="border-gray-300 w-full my-2" />

            {/* HCO Grouping */}
            <div className="text-[10px] text-gray-600">Account Type</div>
            <div className="text-[12px] font-semibold text-gray-900">{hcoDetails.grouping || "Unknown"}</div>
            <hr className="border-gray-300 w-full my-2" />

            {/* Scientific Activities */}
            <div className="w-full">
              <div className="text-[10px] text-gray-600">HCO Treated Volume Potential</div>
              <div className="text-[12px] font-semibold text-gray-900">{hcoData[0]?.hco_mdm_tier || "0"}</div>
              <hr className="border-gray-300 w-full my-2" />
            </div>
            <div className="w-full">
              <div className="text-[10px] text-gray-600">Zolgensma Prescriber</div>
              <div className="text-[12px] font-semibold text-gray-900">
              {
  hcoData.some(item =>
    item.zolg_prescriber?.toString().trim().toUpperCase() === "YES"
  ) ? "YES" : "NO"
}

              </div>
              <hr className="border-gray-300 w-full my-2" />
            </div>

            {/* Address */}
            <div className="text-[10px] text-gray-600">Address</div>
            <div className="text-[12px] font-semibold text-gray-900 leading-tight">
              {hcoDetails.address || "Address not available"}
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
                    fill={selectedDrug === "ZOLGENSMA" ? "#6a3d81" : "#8E58B3"}
                    cursor="pointer"
                    onClick={(data) => handleDrugClick({ category: "Zolgensma" })}
                  />
                  <Bar
                    dataKey="Spinraza"
                    stackId="a"
                    fill={selectedDrug === "SPINRAZA" ? "#1c6f7c" : "#2A9FB0"}
                    cursor="pointer"
                    onClick={(data) => handleDrugClick({ category: "Spinraza" })}
                  />
                  <Bar
                    dataKey="Evrysdi"
                    stackId="a"
                    fill={selectedDrug === "EVRYSDI" ? "#9c003f" : "#D50057"}
                    cursor="pointer"
                    onClick={(data) => handleDrugClick({ category: "Evrysdi" })}
                  >
                    <LabelList dataKey="total" position="top" fontSize={9} fill="#333" fontWeight="15px" offset={5} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <hr className="border-gray-300 w-full my-2" />
            </div>

            <div className="flex gap-2 w-full">
              <div className="w-full md:w-1/3 p-4">
                <h2 className="text-gray-700 text-[11px] font-[500] pb-4">#Patients by Age</h2>
                <div className="-ml-8">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={ageData}>
                      <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ fontSize: 10 }} itemStyle={{ fontSize: 10 }} />
                      <Bar
                        dataKey="value"
                        fill={(entry) => (selectedAgeGroup === entry.category ? "#1e5a8d" : "#3680ba")}
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

              <div className="w-full md:w-1/3 p-4">
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
                          <Cell
                            key={`cell-${index}`}
                            fill={selectedDrug === entry.category.toUpperCase() ? "#1e5a8d" : "#3680ba"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="border-l border-gray-300 h-[14rem] mx-2"></div>
              <div className="w-full md:w-1/3 p-4">
                <h2 className="text-gray-700 text-[11px] font-[500] pb-4">#HCPs by Specialty</h2>
                <div className="-ml-8">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={specialtyData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        onClick={(data) => handleSpecialtyClick(data)}
                        cursor="pointer"
                      >
                        {specialtyData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={selectedSpecialty === entry.name ? entry.color.replace("#", "#66") : entry.color}
                            stroke={selectedSpecialty === entry.name ? "#000" : "none"}
                            strokeWidth={selectedSpecialty === entry.name ? 2 : 0}
                          />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 10 }} itemStyle={{ fontSize: 10 }} />
                      <Legend
                        layout="vertical"
                        align="right"
                        verticalAlign="middle"
                        wrapperStyle={{ fontSize: "10px" }}
                        formatter={(value, entry, index) => (
                          <span style={{ marginBottom: "4px", display: "inline-block" }}>
                            {specialtyData[index]?.name}
                          </span>
                        )}
                        onClick={(data) => handleSpecialtyClick(data)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <hr className="border-gray-300 w-full -mt-6" />

            <div className="p-4">
              <div className="flex flex-col gap-2 py-2">
                <div className="flex justify-between items-center">
                  <div className="text-gray-700 text-[11px] font-medium">Affiliated HCPs</div>

                  {/* Rows per page selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 text-[10px]">Rows per page:</span>
                    <select
                      className="border rounded px-2 py-1 text-[10px]"
                      value={rowsPerPage}
                      onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={30}>30</option>
                    </select>
                  </div>
                </div>

                <div className="rounded-lg overflow-hidden shadow">
                  {tableLoading ? (
                    <div className="flex justify-center items-center h-40 bg-white">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  ) : (
                    <>
                      <table className="w-full">
                        <thead className="bg-[#D2D2D2]">
                          <tr>
                            <th className="px-4 py-3 text-left text-[11px] font-bold">HCP Name</th>
                            <th className="px-4 py-3 text-left text-[11px] font-bold">HCP Potential</th>
                            <th className="px-4 py-3 text-left text-[11px] font-bold">Specialty</th>
                            <th className="px-4 py-3 text-left text-[11px] font-bold">Patients count</th>
                            <th className="px-4 py-3 text-left text-[11px] font-bold">#Zolgensma patient</th>
                            <th className="px-4 py-3 text-left text-[11px] font-bold">#Spinraza patient</th>
                            <th className="px-4 py-3 text-left text-[11px] font-bold">#Evrysdi patient</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {paginatedHcpsData.length > 0 ? (
                            paginatedHcpsData.map((hcp, index) => (
                              <tr
                                key={index}
                                className={`border-t border-gray-200 ${selectedHcp === hcp.hcpName ? "bg-blue-50" : ""} hover:bg-gray-50`}
                                // onClick={() => handleHcpClick(hcp.hcpName)}
                                onClick={() => getHCPDetails(hcp.hcpName)}
                              >
                                <td className="px-4 py-3 text-[10px] cursor-pointer">{hcp.hcpName}</td>
                                <td className="px-4 py-3 text-[10px]">{hcp.hcpPotential}</td>
                                <td className="px-4 py-3 text-[10px]">{hcp.specialty}</td>
                                <td className="px-4 py-3 text-[10px]">{hcp.patientCount}</td>
                                <td className="px-4 py-3 text-[10px]">{hcp.zolgensmaPatientCount}</td>
                                <td className="px-4 py-3 text-[10px]">{hcp.spinrazaPatientCount}</td>
                                <td className="px-4 py-3 text-[10px]">{hcp.evrysdiPatientCount}</td>
                              </tr>
                            ))
                          ) : (
                            <tr className="border-t border-gray-200">
                              <td colSpan="7" className="px-4 py-3 text-[10px] text-center">
                                No affiliated HCPs data available
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>

                      {/* Pagination controls */}
                      {totalPages > 1 && (
                        <div className="flex justify-center items-center py-2 bg-white border-t border-gray-200">
                          <button
                            className="px-2 py-1 text-[10px] text-gray-600 disabled:text-gray-400"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(currentPage - 1)}
                          >
                            Previous
                          </button>

                          <div className="flex mx-2">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                              <button
                                key={page}
                                className={`w-6 h-6 mx-1 rounded-full text-[10px] ${
                                  currentPage === page ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
                                }`}
                                onClick={() => setCurrentPage(page)}
                              >
                                {page}
                              </button>
                            ))}
                          </div>

                          <button
                            className="px-2 py-1 text-[10px] text-gray-600 disabled:text-gray-400"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(currentPage + 1)}
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2 items-center py-2 mt-4">
                <div className="text-gray-700 text-[11px] font-medium">Patients Referral Out</div>

                <div className="flex space-x-2">
                  <button
                    className={`px-4 py-2 rounded-full text-[10px] ${
                      activeTab === "all" ? "bg-[#3680ba] text-white" : "bg-gray-200 text-gray-700"
                    }`}
                    onClick={() => handleTabChange("all")}
                  >
                    All Referrals
                  </button>
                  <button
                    className={`px-4 py-2 rounded-full text-[10px] ${
                      activeTab === "within" ? "bg-[#3680ba] text-white" : "bg-gray-200 text-gray-700"
                    }`}
                    onClick={() => handleTabChange("within")}
                  >
                    Within Institute
                  </button>
                  <button
                    className={`px-4 py-2 rounded-full text-[10px] ${
                      activeTab === "outside" ? "bg-[#3680ba] text-white" : "bg-gray-200 text-gray-700"
                    }`}
                    onClick={() => handleTabChange("outside")}
                  >
                    Outside Institute
                  </button>
                </div>
              </div>

              {/* Network Graph Container */}
              <div
                ref={networkRef}
                className="w-full h-[450px] border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden"
              >
                {referralLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : referralData.length === 0 ? (
                  <div className="flex justify-center items-center h-full text-gray-500 text-sm">
                    No referral data available
                  </div>
                ) : null}
              </div>

              {/* Legend for the network graph */}
              <div className="flex items-center justify-start gap-6 mt-4 px-2">
                <div className="flex items-center gap-2">
                  <div className="bg-[#0b5cab] rounded-full w-4 h-4"></div>
                  <span className="text-gray-700 text-[11px]">Current HCO</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-700 text-[11px]">Referred HCOs (colored by organization)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-gray-400 border-0 border-dashed"></div>
                  <span className="text-gray-700 text-[11px]">Outside Organization</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-gray-400"></div>
                  <span className="text-gray-700 text-[11px]">Within Organization</span>
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

export default HCOdeepDive
