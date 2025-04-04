import { ArrowLeft } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts"
import { useLocation } from "react-router-dom"
import * as d3 from "d3"

const HCOdeepDive = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const hcoMdm = location.state?.hco_id || "15046286" // Default HCO MDM if none provided
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

  // Ref for the network graph container
  const networkRef = useRef(null)
  // Ref to track if the graph has been rendered
  const graphRenderedRef = useRef(false)

  useEffect(() => {
    const fetchHCOData = async () => {
      try {
        setLoading(true)
        const hcoUrl = `https://hcp-hco-backend.onrender.com/hco-360?hco_mdm=${encodeURIComponent(hcoMdm)}`
        const response = await fetch(hcoUrl)
        const data = await response.json()

        setHcoData(data)
        processHCOData(data)
      } catch (error) {
        console.error("Error fetching HCO data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchHCOData()
  }, [hcoMdm])

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

      // Process Quarterly Patient Trend Data
      const quarterlyData = [
        { quarter: "Q1 24", "Treated Patients": 0, Zolgensma: 0, Spinraza: 0, Evrysdi: 0 },
        { quarter: "Q2 24", "Treated Patients": 0, Zolgensma: 0, Spinraza: 0, Evrysdi: 0 },
        { quarter: "Q3 24", "Treated Patients": 0, Zolgensma: 0, Spinraza: 0, Evrysdi: 0 },
        { quarter: "Q4 24", "Treated Patients": 0, Zolgensma: 0, Spinraza: 0, Evrysdi: 0 },
      ]

      // Track unique patients per quarter to avoid double counting
      const quarterPatients = [new Set(), new Set(), new Set(), new Set()]
      const quarterDrugPatients = {
        Zolgensma: [new Set(), new Set(), new Set(), new Set()],
        Spinraza: [new Set(), new Set(), new Set(), new Set()],
        Evrysdi: [new Set(), new Set(), new Set(), new Set()],
      }

      // Count patients by drug and quarter (deterministic distribution based on patient_id)
      data.forEach((record) => {
        if (!record.patient_id) return

        // Distribute records across quarters using the last character of patient_id
        const lastChar = record.patient_id.slice(-1)
        const quarterIndex = Number.parseInt(lastChar, 36) % 4 // Convert to number in base 36, then mod 4

        // Add patient to the quarter's unique patient set
        quarterPatients[quarterIndex].add(record.patient_id)

        // Add patient to the appropriate drug's patient set for this quarter
        if (record.drug_name === "ZOLGENSMA") {
          quarterDrugPatients.Zolgensma[quarterIndex].add(record.patient_id)
        } else if (record.drug_name === "SPINRAZA") {
          quarterDrugPatients.Spinraza[quarterIndex].add(record.patient_id)
        } else if (record.drug_name === "EVRYSDI") {
          quarterDrugPatients.Evrysdi[quarterIndex].add(record.patient_id)
        }
      })

      // Update quarterly data with unique patient counts
      for (let i = 0; i < 4; i++) {
        quarterlyData[i]["Treated Patients"] = quarterPatients[i].size
        quarterlyData[i]["Zolgensma"] = quarterDrugPatients.Zolgensma[i].size
        quarterlyData[i]["Spinraza"] = quarterDrugPatients.Spinraza[i].size
        quarterlyData[i]["Evrysdi"] = quarterDrugPatients.Evrysdi[i].size
      }

      setQuarterlyPatientTrendData(quarterlyData)

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

      // Process Referral Out data
      const referralMap = new Map()

      data.forEach((record) => {
        if (!record.ref_npi || record.ref_npi === "-") return

        const refHcoName = record.ref_name !== "-" ? record.ref_name : "Unknown HCO"
        const key = refHcoName

        if (!referralMap.has(key)) {
          referralMap.set(key, {
            accountName: refHcoName,
            accountArchetype: record.hco_grouping || "Unknown",
            hcoTier: record.hco_mdm_tier || "Unknown",
            spinrazaSite: "", // Leave blank as requested
            patients: new Set(),
            isWithinInstitute: refHcoName === firstRecord.hco_mdm_name,
          })
        }

        if (record.patient_id) {
          referralMap.get(key).patients.add(record.patient_id)
        }
      })

      // Convert to array with patient counts
      const referralArray = Array.from(referralMap.values()).map((item) => ({
        accountName: item.accountName,
        accountArchetype: item.accountArchetype,
        hcoTier: item.hcoTier,
        spinrazaSite: item.spinrazaSite,
        patientCount: item.patients.size,
        isWithinInstitute: item.isWithinInstitute,
      }))

      // Sort by patient count
      referralArray.sort((a, b) => b.patientCount - a.patientCount)

      setAllReferralData(referralArray)
      filterReferralData("all", referralArray)
    }
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

  // Effect to render the network graph when referral data changes
  useEffect(() => {
    if (networkRef.current && !graphRenderedRef.current) {
      renderNetworkGraph()
      graphRenderedRef.current = true
    }
  }, [referralData])

  // Replace the renderNetworkGraph function with this improved version that adds more vertical spacing and zoom functionality

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

      // Create SVG
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

      // Group referrals by archetype and tier
      const archetypeGroups = {}

      referralData.forEach((referral) => {
        const archetype = referral.accountArchetype || "Unknown"
        const tier = referral.hcoTier || "Unknown"

        if (!archetypeGroups[archetype]) {
          archetypeGroups[archetype] = {}
        }

        if (!archetypeGroups[archetype][tier]) {
          archetypeGroups[archetype][tier] = []
        }

        archetypeGroups[archetype][tier].push(referral)
      })

      // Calculate positions for each level
      const archetypeLevel = innerWidth / 4 // Position at 1/4 of the width
      const tierLevel = innerWidth / 2 // Position at 1/2 of the width
      const accountLevel = (innerWidth * 3) / 4 // Position at 3/4 of the width

      // Add archetype, tier, and account nodes
      let archetypeIndex = 0
      let tierIndex = 0
      let accountIndex = 0

      // Track nodes by type to avoid duplicates
      const archetypeNodes = {}
      const tierNodes = {}

      Object.entries(archetypeGroups).forEach(([archetypeName, tiers]) => {
        // Create archetype node if not exists
        if (!archetypeNodes[archetypeName]) {
          const archetypeNode = {
            id: `archetype-${archetypeIndex}`,
            name: archetypeName,
            type: "archetype",
            level: 1,
            x: archetypeLevel,
            y: 0, // Will be calculated later
          }
          archetypeNodes[archetypeName] = archetypeNode
          nodes.push(archetypeNode)
          archetypeIndex++

          // Link from root to archetype
          links.push({
            source: rootNode.id,
            target: archetypeNode.id,
            value: 1,
          })
        }

        Object.entries(tiers).forEach(([tierName, accounts]) => {
          // Create tier node if not exists
          const tierKey = `${archetypeName}-${tierName}`
          if (!tierNodes[tierKey]) {
            const tierNode = {
              id: `tier-${tierIndex}`,
              name: tierName,
              type: "tier",
              level: 2,
              archetypeId: archetypeNodes[archetypeName].id,
              x: tierLevel,
              y: 0, // Will be calculated later
            }
            tierNodes[tierKey] = tierNode
            nodes.push(tierNode)
            tierIndex++

            // Link from archetype to tier
            links.push({
              source: archetypeNodes[archetypeName].id,
              target: tierNode.id,
              value: 1,
            })
          }

          // Add account nodes for this tier
          accounts.forEach((account) => {
            const accountNode = {
              id: `account-${accountIndex}`,
              name: account.accountName,
              type: "account",
              level: 3,
              tierId: tierNodes[tierKey].id,
              patients: account.patientCount || 0,
              x: accountLevel,
              y: 0, // Will be calculated later
            }
            nodes.push(accountNode)
            accountIndex++

            // Link from tier to account
            links.push({
              source: tierNodes[tierKey].id,
              target: accountNode.id,
              value: account.patientCount,
            })
          })
        })
      })

      // Calculate y-positions for nodes at each level with increased spacing
      const nodesByLevel = [
        [rootNode], // Level 0 - Current HCO
        nodes.filter((n) => n.level === 1), // Level 1 - Archetypes
        nodes.filter((n) => n.level === 2), // Level 2 - Tiers
        nodes.filter((n) => n.level === 3), // Level 3 - Accounts
      ]

      // Position nodes at each level with increased vertical spacing
      nodesByLevel.forEach((levelNodes, level) => {
        // Increase padding for account nodes (level 3)
        const nodePadding = level === 3 ? 40 : 20

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
        .attr("stroke", "#ccc")
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
          if (d.type === "archetype") return 20
          if (d.type === "tier") return 15
          if (d.type === "account") return 10 + Math.sqrt(d.patients || 1) * 1.5
          return 10
        })
        .attr("fill", (d) => {
          if (d.type === "current") return "#0b5cab"
          if (d.type === "archetype") return "#9370db"
          if (d.type === "tier") return "#69a7ad"
          if (d.type === "account") return "#f28e2b"
          return "#ccc"
        })
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)

      // Add text labels
      nodeGroups
        .append("text")
        .attr("x", (d) => {
          if (d.level === 0) return -35
          if (d.level === 3) return 20
          return 0
        })
        .attr("y", (d) => {
          if (d.level === 1 || d.level === 2) return -20
          return 0
        })
        .attr("text-anchor", (d) => {
          if (d.level === 0) return "end"
          if (d.level === 3) return "start"
          return "middle"
        })
        .attr("font-size", "11px")
        .attr("font-weight", "500")
        .attr("fill", "#333")
        .attr("dy", ".35em")
        .text((d) => d.name)

      // Add patient count for account nodes
      nodeGroups
        .filter((d) => d.type === "account")
        .append("text")
        .attr("x", 20)
        .attr("y", 15)
        .attr("text-anchor", "start")
        .attr("font-size", "9px")
        .attr("fill", "#555")
        .text((d) => `Patients: ${d.patients}`)

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
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="p-4 bg-gray-100">
      {/* Back Button */}
      <button onClick={() => navigate("/")} className="flex gap-2 py-2 px-1 items-center">
        <ArrowLeft className="w-4 h-4 text-gray-600" />
        <span className="text-gray-700 text-[12px]">Back</span>
      </button>

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
              <div className="text-[10px] text-gray-600">Tier/Cluster</div>
              <div className="text-[12px] font-semibold text-gray-900">{hcoData[0]?.hco_mdm_tier || "0"}</div>
              <hr className="border-gray-300 w-full my-2" />
            </div>
            <div className="w-full">
              <div className="text-[10px] text-gray-600">Zolgensma Ever</div>
              <div className="text-[12px] font-semibold text-gray-900">{hcoData[0]?.zolg_prescriber || "0"}</div>
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
                    <div className="bg-[#0b5cab] rounded-full w-2 h-2"></div>
                    <span className="text-gray-700 text-[9px]">Treated Patients</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="bg-[#9370db] rounded-full w-2 h-2"></div>
                    <span className="text-gray-700 text-[9px]">Zolgensma</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="bg-[#69a7ad] rounded-full w-2 h-2"></div>
                    <span className="text-gray-700 text-[9px]">Spinraza</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="bg-[#0e7d0c] rounded-full w-2 h-2"></div>
                    <span className="text-gray-700 text-[9px]">Evrysdi</span>
                  </div>
                </div>
              </div>

              <ResponsiveContainer width="100%" height="90%" style={{ marginLeft: -10 }}>
                <LineChart data={quarterlyPatientTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="quarter" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 10 }} itemStyle={{ fontSize: 10 }} />

                  {/* Lines for each drug */}
                  <Line type="monotone" dataKey="Treated Patients" stroke="#0b5cab" strokeWidth={2} />
                  <Line type="monotone" dataKey="Zolgensma" stroke="#9370db" strokeWidth={2} />
                  <Line type="monotone" dataKey="Spinraza" stroke="#69a7ad" strokeWidth={2} />
                  <Line type="monotone" dataKey="Evrysdi" stroke="#0e7d0c" strokeWidth={2} />
                </LineChart>
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
                      <Bar dataKey="value" fill="#3680ba" barSize={40} radius={[6, 6, 0, 0]} />
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
                      <Bar dataKey="value" fill="#3680ba" barSize={40} radius={[6, 6, 0, 0]} />
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
                      >
                        {specialtyData.map((entry, index) => (
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
                          <span style={{ marginBottom: "4px", display: "inline-block" }}>
                            {specialtyData[index]?.name}
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <hr className="border-gray-300 w-full -mt-6" />

            <div className="p-4">
              <div className="flex flex-col gap-2 py-2">
                <div className="text-gray-700 text-[11px] font-medium">Affiliated HCPs</div>
                <div className="rounded-lg overflow-hidden shadow">
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
                      {affiliatedHcpsData.length > 0 ? (
                        affiliatedHcpsData.map((hcp, index) => (
                          <tr key={index} className="border-t border-gray-200">
                            <td className="px-4 py-3 text-[10px]">{hcp.hcpName}</td>
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
                {referralData.length === 0 && (
                  <div className="flex justify-center items-center h-full text-gray-500 text-sm">
                    No referral data available
                  </div>
                )}
              </div>

              {/* Legend for the network graph */}
              <div className="flex items-center justify-start gap-6 mt-4 px-2">
                <div className="flex items-center gap-2">
                  <div className="bg-[#0b5cab] rounded-full w-4 h-4"></div>
                  <span className="text-gray-700 text-[11px]">Current HCO</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-[#9370db] rounded-full w-4 h-4"></div>
                  <span className="text-gray-700 text-[11px]">Account Archetype</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-[#69a7ad] rounded-full w-4 h-4"></div>
                  <span className="text-gray-700 text-[11px]">HCO Tier</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-[#f28e2b] rounded-full w-4 h-4"></div>
                  <span className="text-gray-700 text-[11px]">Referred HCO</span>
                </div>
              </div>

              {/* Instructions */}
              <div className="text-gray-500 text-[10px] mt-2 px-2">
                <p>* Node size indicates number of patients referred</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HCOdeepDive