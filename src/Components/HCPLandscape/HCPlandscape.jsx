"use client"

import { useState, useEffect } from "react"
import { FaUserDoctor } from "react-icons/fa6"
import { MoveUpRight } from "lucide-react"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts"

const HCPlandscape = () => {
  const [kpiData, setKpiData] = useState(null)
  const [quarterPatData, setQuarterPatData] = useState([])
  const [brandData, setBrandData] = useState([])
  const [insightsData, setInsightsData] = useState([])

  // Calculate age group and specialty data from insights
  const [hcpsplit_age, setHcpsplitAge] = useState([])
  const [hcpsplit_specialty_data, setHcpsplitSpecialtyData] = useState([])
  const [potential_data, setPotentialData] = useState([])
  const [table_data, setTableData] = useState([])
  const [allTableData, setAllTableData] = useState([])
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if data is already in sessionStorage
    const cachedData = sessionStorage.getItem("hcplandscapeData")

    if (cachedData) {
      const parsedData = JSON.parse(cachedData)
      setKpiData(parsedData.kpiData)
      setQuarterPatData(parsedData.quarterPatData)
      setBrandData(parsedData.brandData)
      setHcpsplitAge(parsedData.hcpsplit_age)
      setHcpsplitSpecialtyData(parsedData.hcpsplit_specialty_data)
      setPotentialData(parsedData.potential_data)
      setAllTableData(parsedData.allTableData)
      setTableData(parsedData.allTableData.slice(0, rowsPerPage))
      setIsLoading(false)
      return
    }

    // If no cached data, fetch from APIs
    const fetchAllData = async () => {
      try {
        // Fetch KPI Card data
        const kpiResponse = await fetch("https://hcp-hco-backend.onrender.com/fetch-hcplandscape-kpicard")
        const kpiData = await kpiResponse.json()
        setKpiData(kpiData[0])

        // Fetch Quarter Patient data
        const quarterPatResponse = await fetch("https://hcp-hco-backend.onrender.com/fetch-hcplandscape-quarterpat")
        const quarterPatData = await quarterPatResponse.json()
        const formattedQuarterData = quarterPatData.map((item) => ({
          quarter: `Q${item.quarter} 24`,
          value: item.patient_count,
        }))
        setQuarterPatData(formattedQuarterData)

        // Fetch Brand data
        const brandResponse = await fetch("https://hcp-hco-backend.onrender.com/fetch-hcplandscape-brand")
        const brandData = await brandResponse.json()
        const formattedBrandData = brandData.map((item) => ({
          quarter: `2024 Q${item.quarter}`,
          Zolgensma: item.ZOLGENSMA,
          Spinraza: item.SPINRAZA,
          Evrysdi: item.EVRYSDI,
        }))
        setBrandData(formattedBrandData)

        // Fetch Insights data
        const insightsResponse = await fetch("https://hcp-hco-backend.onrender.com/fetch-hcplandscape-insights")
        const insightsData = await insightsResponse.json()
        setInsightsData(insightsData)

        // Process data for age group chart
        const ageGroups = processAgeGroupData(insightsData)
        setHcpsplitAge(ageGroups)

        // Process data for specialty chart
        const specialtyData = processSpecialtyData(insightsData)
        setHcpsplitSpecialtyData(specialtyData)

        // Process data for potential chart
        const potentialData = processPotentialData(insightsData)
        setPotentialData(potentialData)

        // Process data for table
        const tableData = processTableData(insightsData)
        setAllTableData(tableData)
        setTableData(tableData.slice(0, rowsPerPage))

        // Cache the data in sessionStorage
        sessionStorage.setItem(
          "hcplandscapeData",
          JSON.stringify({
            kpiData: kpiData[0],
            quarterPatData: formattedQuarterData,
            brandData: formattedBrandData,
            hcpsplit_age: ageGroups,
            hcpsplit_specialty_data: specialtyData,
            potential_data: potentialData,
            allTableData: tableData,
          }),
        )

        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching data:", error)
        setIsLoading(false)
      }
    }

    fetchAllData()
  }, [])

  // Update table data when rowsPerPage changes
  useEffect(() => {
    setTableData(allTableData.slice(0, rowsPerPage))
  }, [rowsPerPage, allTableData])

  // Function to process age group data
  const processAgeGroupData = (data) => {
    // Get unique segments
    const segments = [...new Set(data.map((item) => item.hcp_segment))]

    // Count occurrences by segment and age group
    const ageGroupCounts = {}

    segments.forEach((segment) => {
      ageGroupCounts[segment] = {
        segment,
        "<2": 0,
        "3-17": 0,
        ">18": 0,
      }
    })

    data.forEach((item) => {
      if (item.age_group === "0 to 2") {
        ageGroupCounts[item.hcp_segment]["<2"]++
      } else if (item.age_group === "3 to 17") {
        ageGroupCounts[item.hcp_segment]["3-17"]++
      } else if (item.age_group === "Above 18") {
        ageGroupCounts[item.hcp_segment][">18"]++
      }
    })

    return Object.values(ageGroupCounts)
  }

  // Function to process specialty data with correct mapping
  const processSpecialtyData = (data) => {
    // Get unique segments
    const segments = [...new Set(data.map((item) => item.hcp_segment))]

    // Count occurrences by segment and specialty
    const specialtyCounts = {}

    segments.forEach((segment) => {
      specialtyCounts[segment] = {
        segment,
        PEDIATRIC: 0,
        "CHILD NEUROLOGY": 0,
        NEUROLOGY: 0,
        NEUROMUSCULAR: 0,
        "NP/PA": 0,
        RADIOLOGY: 0,
        "ALL OTHERS": 0,
      }
    })

    data.forEach((item) => {
      const specialty = item.final_spec.toUpperCase()
      if (specialtyCounts[item.hcp_segment][specialty] !== undefined) {
        specialtyCounts[item.hcp_segment][specialty]++
      } else {
        specialtyCounts[item.hcp_segment]["ALL OTHERS"]++
      }
    })

    // Convert to the format expected by the chart
    return Object.values(specialtyCounts).map((item) => ({
      segment: item.segment,
      PCP: 0, // Keep for backward compatibility
      Pediatric: item["PEDIATRIC"],
      "All Others": item["ALL OTHERS"],
      "Child Neurology": item["CHILD NEUROLOGY"],
      Neuromuscular: item["NEUROMUSCULAR"],
      "NP/PA": item["NP/PA"],
      Neurology: item["NEUROLOGY"],
      Radiology: item["RADIOLOGY"],
    }))
  }

  // Function to process potential data
  // Function to process potential data
const processPotentialData = (data) => {
  // Create a Map to track unique patient IDs for each segment
  const segmentPatientMap = new Map();
  
  // Process each record
  data.forEach((item) => {
    if (item.hcp_segment && item.patient_id) {
      // Normalize segment name (uppercase for consistency)
      const segment = item.hcp_segment.toUpperCase();
      
      // Initialize set for this segment if it doesn't exist
      if (!segmentPatientMap.has(segment)) {
        segmentPatientMap.set(segment, new Set());
      }
      
      // Add patient ID to the set for this segment
      segmentPatientMap.get(segment).add(item.patient_id);
    }
  });
  
  // Map segments to colors and labels
  const colorMap = {
    HIGH: "#B073FE",
    MEDIUM: "#FDBA74",
    LOW: "#B4F06C",
    "V-LOW": "#6EE79A",
    "VERY LOW": "#6EE79A",
  };

  const labelMap = {
    HIGH: "High Potential",
    MEDIUM: "Moderate",
    LOW: "Low Potential",
    "V-LOW": "Very Low Potential",
    "VERY LOW": "Very Low Potential",
  };
  
  // Convert map to array and format for the chart
  const result = Array.from(segmentPatientMap).map(([segment, patientSet]) => ({
    label: labelMap[segment] || segment,
    value: patientSet.size,
    color: colorMap[segment] || "#000000",
  }));
  
  // Sort by predefined order: High, Moderate, Low, V. Low
  const orderMap = { 'HIGH': 0, 'MEDIUM': 1, 'MODERATE': 1, 'LOW': 2, 'V-LOW': 3, 'VERY LOW': 3 };
  
  result.sort((a, b) => {
    const aSegment = Object.keys(labelMap).find(key => labelMap[key] === a.label) || '';
    const bSegment = Object.keys(labelMap).find(key => labelMap[key] === b.label) || '';
    const aOrder = orderMap[aSegment] ?? 999;
    const bOrder = orderMap[bSegment] ?? 999;
    return aOrder - bOrder;
  });
  
  return result;
};

  // Function to process table data
  const processTableData = (data) => {
    // Get unique HCPs
    const uniqueHcps = {}

    data.forEach((item) => {
      if (!uniqueHcps[item.hcp_id]) {
        uniqueHcps[item.hcp_id] = {
          "HCP ID": item.hcp_id,
          "HCP Name": item.hcp_name,
          Specialty: item.final_spec,
          "Affiliated Accounts": item.hco_mdm_name,
        }
      }
    })

    // Convert to array and add rank
    return Object.values(uniqueHcps).map((hcp, index) => ({
      Rank: String(index + 1).padStart(2, "0"),
      ...hcp,
    }))
  }

  // Handle row count change
  const handleRowCountChange = (count) => {
    setRowsPerPage(count)
  }

  // Calculate max value for potential data
  const maxValue = potential_data.length > 0 ? Math.max(...potential_data.map((item) => item.value), 0) : 0

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 w-full p-2">
      <div className="flex gap-4 w-full">
        <div className="flex flex-col bg-white rounded-xl border-b border-x  border-gray-300 w-[20%] h-20 p-2 justify-between">
          <div className="flex gap-2 items-center">
            <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
              <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
            </div>
            <span className="text-gray-500 text-[11px] font-[500]">Rendering HCPs</span>
          </div>
          <span className="text-gray-700 text-[16px] font-[500] pl-2">{kpiData ? kpiData.hcp_id : "0"}</span>
        </div>
        <div className="flex flex-col bg-white rounded-xl border-b border-x  border-gray-300 w-[20%] h-20 p-2 justify-between">
          <div className="flex flex-col justify-between h-full">
            <div className="flex gap-2 items-center">
              <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
              </div>
              <span className="text-gray-500 text-[11px] font-[500]">SMA Patients Treated in Last 12M</span>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-gray-700 text-[16px] font-[500]">{kpiData ? kpiData.pt_12_mth : "0"}</span>
              <MoveUpRight className="text-green-500 ml-2" style={{ width: "10px", height: "10px" }} />
              <span className="text-green-500 text-xs">5.2%</span>
              <span className="text-gray-500 text-xs">vs last month</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col bg-white rounded-xl border-b border-x  border-gray-300 w-[20%] h-20 p-2 justify-between">
          <div className="flex gap-2 items-center">
            <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
              <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
            </div>
            <span className="text-gray-500 text-[11px] font-[500]">Avg #Pats Treated per HCPs</span>
          </div>
          <span className="text-gray-700 text-[16px] font-[500] pl-2">
            {kpiData ? kpiData.patient_per_hcp.toFixed(1) : "0"}
          </span>
        </div>

        <div className="flex flex-col bg-white rounded-xl border-b border-x  border-gray-300 w-[20%] h-20 p-2 justify-between">
          <div className="flex gap-2 items-center">
            <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
              <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
            </div>
            <span className="text-gray-500 text-[11px] font-[500]">#Referring HCPs</span>
          </div>
          <span className="text-gray-700 text-[16px] font-[500] pl-2">{kpiData ? kpiData.ref_npi : "0"}</span>
        </div>

        <div className="flex flex-col bg-white rounded-xl border-b border-x  border-gray-300 w-[20%] h-20 p-2 justify-between">
          <div className="flex gap-2 items-center">
            <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
              <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
            </div>
            <span className="text-gray-500 text-[11px] font-[500]">Avg #Pats Referred per HCPs</span>
          </div>
          <span className="text-gray-700 text-[16px] font-[500] pl-2">{kpiData ? kpiData.avg_patients_per_hco : "0"}</span>
        </div>
      </div>
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
                <th className="p-2 text-left w-1/5">Rank</th>
                <th className="p-2 text-left w-1/5">HCP ID</th>
                <th className="p-2 text-left w-1/5">HCP Name</th>
                <th className="p-2 text-left w-1/5">Specialty</th>
                <th className="p-2 text-left w-1/5">Affiliated Accounts</th>
              </tr>
            </thead>

            <tbody>
              {table_data.map((hcp, index) => (
                <tr key={index} className="border-t text-gray-800 text-[10px]">
                  <td className="p-2 w-1/5">{hcp.Rank}</td>
                  <td className="p-2 w-1/5">{hcp["HCP ID"]}</td>
                  <td className="p-2 w-1/5">{hcp["HCP Name"]}</td>
                  <td className="p-2 w-1/5">{hcp.Specialty}</td>
                  <td className="p-2 w-1/5">{hcp["Affiliated Accounts"]}</td>
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

