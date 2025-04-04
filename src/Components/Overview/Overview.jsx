import { useState, useEffect, useCallback } from "react"
import { FaUserDoctor } from "react-icons/fa6"
import PrescriberClusterChart from "./PrescriberChart"
import HCOchart from "./HCOchart"
import { useNavigate } from "react-router-dom"
import USAMap from "./Map"

const Overview = () => {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedState, setSelectedState] = useState(null)
  const [metrics, setMetrics] = useState({
    totalHCPs: 0,
    totalPatients: 0,
    avgTreatingHCPs: 0,
    avgPatientsPerHCP: 0,
    hcpsReferringPatients: 0,
    avgPatientsReferredPerHCP: 0,
    totalHCOs: 0,
    zolgemsmaEver: 0,
    avgTreatingHCOs: 0,
    avgPatientsPerHCO: 0,
    hcosReferringPatients: 0,
    avgPatientsReferredPerHCO: 0,
    topHCPs: [],
    topHCOs: [],
  })

  // Fetch data only once when component mounts
  useEffect(() => {
    fetchData()
  }, [])

  // Update filtered data when selected state changes
  useEffect(() => {
    if (data.length > 0) {
      if (selectedState) {
        const stateData = data.filter((item) => item.hcp_state === selectedState)
        setFilteredData(stateData)
        calculateMetrics(stateData)
      } else {
        setFilteredData(data)
        calculateMetrics(data)
      }
    }
  }, [selectedState, data])

  const fetchData = async () => {
    try {
      // Check if data is already in sessionStorage to avoid unnecessary API calls
      const cachedData = sessionStorage.getItem("overviewData")

      if (cachedData) {
        const parsedData = JSON.parse(cachedData)
        setData(parsedData)
        setFilteredData(parsedData)
        calculateMetrics(parsedData)
        setLoading(false)
        return
      }

      const response = await fetch("https://hcp-hco-backend.onrender.com/fetch-data")
      const jsonData = await response.json()

      // Cache the data in sessionStorage
      sessionStorage.setItem("overviewData", JSON.stringify(jsonData))

      setData(jsonData)
      setFilteredData(jsonData)
      calculateMetrics(jsonData)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching data:", error)
      setLoading(false)
    }
  }

  // Memoize the calculateMetrics function to prevent unnecessary recalculations
  const calculateMetrics = useCallback((data) => {
    const uniqueRendHCP = new Set(data.map((item) => item.hcp_id).filter((id) => id && id !== "-"))
    const uniqueRefHCP = new Set(data.map((item) => item.ref_npi).filter((npi) => npi && npi !== "-"))
    const uniqueHCPs = new Set([...uniqueRendHCP, ...uniqueRefHCP])

    const uniquePatients = new Set(data.map((item) => item.patient_id))

    const uniqueRendHCO = new Set(data.map((item) => item.hco_mdm).filter((id) => id && id !== "-"))
    const uniqueRefHCO = new Set(data.map((item) => item.ref_hco_npi_mdm).filter((npi) => npi && npi !== "-"))

    const uniqueHCOs = new Set([...uniqueRendHCO, ...uniqueRefHCO])

    // Count Zolgemsma prescribers (HCPs where zolg_prescriber='Yes')
    const zolgemsmaHCPs = new Set(data.filter((item) => item.zolg_prescriber === "Yes").map((item) => item.hcp_id))

    const zolgemsmaHCOs = new Set(data.filter((item) => item.zolg_prescriber === "Yes").map((item) => item.hco_mdm))
    const zolgemsmaHCOCount = zolgemsmaHCOs.size

    // Calculate patient counts per HCP
    const hcpPatientMap = new Map()
    const hcpIdToNameMap = new Map() // Map to store hcp_id to hcp_name mapping

    data.forEach((item) => {
      if (item.hcp_id && item.hcp_id !== "-") {
        if (!hcpPatientMap.has(item.hcp_id)) {
          hcpPatientMap.set(item.hcp_id, new Set())
          hcpIdToNameMap.set(item.hcp_id, item.hcp_name) // Store the mapping
        }
        if (item.patient_id) {
          hcpPatientMap.get(item.hcp_id).add(item.patient_id)
        }
      }
    })

    // Calculate patient counts per HCO
    const hcoPatientMap = new Map()
    const hcoIdToNameMap = new Map() // Map to store hco_mdm to hco_mdm_name mapping

    data.forEach((item) => {
      if (item.hco_mdm && item.hco_mdm !== "-") {
        if (!hcoPatientMap.has(item.hco_mdm)) {
          hcoPatientMap.set(item.hco_mdm, new Set())
          hcoIdToNameMap.set(item.hco_mdm, item.hco_mdm_name) // Store the mapping
        }
        if (item.patient_id) {
          hcoPatientMap.get(item.hco_mdm).add(item.patient_id)
        }
      }
    })

    // Get referring HCPs and HCOs
    const referringHCPs = new Set()
    const referringHCOs = new Set()
    data.forEach((item) => {
      if (item.ref_npi && item.ref_npi !== "-") {
        referringHCPs.add(item.hcp_id)
        referringHCOs.add(item.hco_mdm)
      }
    })

    // Calculate average patients per HCP (SQL equivalent logic)
    const patientCountsPerHCP = Array.from(hcpPatientMap.values()).map((patientSet) => patientSet.size)

    const avgPatientsPerHCP =
      patientCountsPerHCP.length > 0
        ? patientCountsPerHCP.reduce((sum, count) => sum + count, 0) / patientCountsPerHCP.length
        : 0

    const patientCountsPerHCO = Array.from(hcoPatientMap.values()).map((patientSet) => patientSet.size)

    const avgPatientsPerHCO =
      patientCountsPerHCO.length > 0
        ? patientCountsPerHCO.reduce((sum, count) => sum + count, 0) / patientCountsPerHCO.length
        : 0

    // Calculate Top HCPs by patient volume - with HCP IDs
    const hcpVolume = Array.from(hcpPatientMap.entries()).map(([hcpId, patients]) => {
      return {
        id: hcpId,
        name: hcpIdToNameMap.get(hcpId) || `HCP ${hcpId}`,
        volume: patients.size,
      }
    })

    const topHCPs = hcpVolume.sort((a, b) => b.volume - a.volume).slice(0, 10)

    // Calculate Top HCOs by patient volume - with HCO IDs
    const hcoVolume = Array.from(hcoPatientMap.entries()).map(([hcoId, patients]) => {
      const hcoName = hcoIdToNameMap.get(hcoId) || "Unknown"
      return {
        id: hcoId,
        name: hcoName !== "-" ? hcoName : "Unknown",
        volume: patients.size,
      }
    })

    // Filter out "Unknown" HCOs and then take top 10
    const topHCOs = hcoVolume
      .filter((hco) => hco.name !== "Unknown")
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10)

    // Set metrics
    setMetrics({
      totalHCPs: uniqueHCPs.size,
      totalPatients: uniquePatients.size,
      avgTreatingHCPs: uniqueRendHCP.size,
      avgPatientsPerHCP: Math.round(avgPatientsPerHCP * 10) / 10,
      hcpsReferringPatients: uniqueRefHCP.size,
      avgPatientsReferredPerHCP:
        Math.round((uniqueRefHCP.size > 0 ? uniquePatients.size / uniqueRefHCP.size : 0) * 10) / 10,
      totalHCOs: uniqueHCOs.size,
      zolgemsmaEver: zolgemsmaHCOCount,
      avgTreatingHCOs: uniqueRendHCO.size,
      avgPatientsPerHCO: Math.round(avgPatientsPerHCO * 10) / 10,
      hcosReferringPatients: referringHCOs.size,
      avgPatientsReferredPerHCO:
        Math.round((referringHCOs.size > 0 ? uniquePatients.size / referringHCOs.size : 0) * 10) / 10,
      topHCPs,
      topHCOs,
    })
  }, [])

  // Handle state selection from the map
  const handleStateSelect = (stateAbbr) => {
    setSelectedState(stateAbbr)
  }

  const getHCPDetails = (hcpName) => {
    navigate("/hcp", { state: { hcp_name: hcpName } })
  }

  const getHCODetails = (hcoId) => {
    navigate("/hco", { state: { hco_id: hcoId } })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        
      </div>
    )
  }

  return (
    <div className="flex gap-4 w-full p-2">
      <div className="flex flex-col w-[29%] gap-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between">
            <div className="flex gap-2 items-center">
              <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
              </div>
              <span className="text-gray-500 text-[11px] font-[500]">Total HCPs</span>
            </div>
            <span className="text-gray-700 text-[16px] font-[500] pl-2">{metrics.totalHCPs}</span>
          </div>
          <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between">
            <div className="flex gap-2 items-center">
              <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
              </div>
              <span className="text-gray-500 text-[11px] font-[500]">Total Treated Patients</span>
            </div>
            <span className="text-gray-700 text-[16px] font-[500] pl-2">{metrics.totalPatients}</span>
          </div>
          <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between">
            <div className="flex gap-2 items-center">
              <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
              </div>
              <span className="text-gray-500 text-[11px] font-[500]">Average Rendering HCPs</span>
            </div>
            <span className="text-gray-700 text-[16px] font-[500] pl-2">{metrics.avgTreatingHCPs}</span>
          </div>
          <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between">
            <div className="flex gap-2 items-center">
              <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
              </div>
              <span className="text-gray-500 text-[11px] font-[500]">Avg.Patients per HCPs</span>
            </div>
            <span className="text-gray-700 text-[16px] font-[500] pl-2">{metrics.avgPatientsPerHCP}</span>
          </div>
          <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between">
            <div className="flex gap-2 items-center">
              <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
              </div>
              <span className="text-gray-500 text-[11px] font-[500]">HCPs Referring Patients</span>
            </div>
            <span className="text-gray-700 text-[16px] font-[500] pl-2">{metrics.hcpsReferringPatients}</span>
          </div>
          <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between">
            <div className="flex gap-2 items-center">
              <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
              </div>
              <span className="text-gray-500 text-[11px] font-[500]">Avg.Patients Referred per HCP</span>
            </div>
            <span className="text-gray-700 text-[16px] font-[500] pl-2">{metrics.avgPatientsReferredPerHCP}</span>
          </div>
        </div>

        <PrescriberClusterChart hcpData={filteredData} />

        <div className="flex flex-col bg-white rounded-xl border border-gray-300 w-full shadow-sm">
          <div className="flex gap-2 items-center p-2">
            <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
              <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
            </div>
            <span className="text-gray-500 text-[11px] font-[500]">Top 10 HCPs by SMA Treated Patients Vol</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-blue-200 text-gray-700 text-[10px] font-medium">
                  <th className="p-2 text-left">HCP Name</th>
                  <th className="p-2 text-left">HCP ID</th>
                  <th className="p-2 text-right">Treated pat. Vol</th>
                </tr>
              </thead>
              <tbody>
                {metrics.topHCPs.map((hcp, index) => (
                  <tr key={index} className="border-t text-gray-800 text-[9px]">
                    <td onClick={() => getHCPDetails(hcp.name)} className="p-2 cursor-pointer">
                      {hcp.name}
                    </td>
                    <td className="p-2">{hcp.id}</td>
                    <td className="p-2 text-right">{hcp.volume}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex flex-col w-[42%]">
        {/* <USAMap onStateSelect={handleStateSelect} /> */}
        {/* {selectedState && (
          <div className="mt-2 p-2 bg-blue-50 rounded-md text-center">
            <span className="text-sm font-medium">
              Showing data for: <span className="text-blue-700">{ABBR_TO_STATE[selectedState]}</span>
              <button
                onClick={() => setSelectedState(null)}
                className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs hover:bg-blue-200"
              >
                Clear Filter
              </button>
            </span>
          </div>
        )} */}
      </div>

      <div className="flex flex-col w-[29%] gap-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between">
            <div className="flex gap-2 items-center">
              <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
              </div>
              <span className="text-gray-500 text-[11px] font-[500]">Total HCOs</span>
            </div>
            <span className="text-gray-700 text-[16px] font-[500] pl-2">{metrics.totalHCOs}</span>
          </div>
          <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between">
            <div className="flex gap-2 items-center">
              <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
              </div>
              <span className="text-gray-500 text-[11px] font-[500]">Zolgensma Treating HCOs</span>
            </div>
            <span className="text-gray-700 text-[16px] font-[500] pl-2">{metrics.zolgemsmaEver}</span>
          </div>
          <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between">
            <div className="flex gap-2 items-center">
              <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
              </div>
              <span className="text-gray-500 text-[11px] font-[500]">Average Treating HCOs</span>
            </div>
            <span className="text-gray-700 text-[16px] font-[500] pl-2">{metrics.avgTreatingHCOs}</span>
          </div>
          <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between">
            <div className="flex gap-2 items-center">
              <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
              </div>
              <span className="text-gray-500 text-[11px] font-[500]">Avg.Patients per HCOs</span>
            </div>
            <span className="text-gray-700 text-[16px] font-[500] pl-2">{metrics.avgPatientsPerHCO}</span>
          </div>
          <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between">
            <div className="flex gap-2 items-center">
              <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
              </div>
              <span className="text-gray-500 text-[11px] font-[500]">HCOs Referring Patients</span>
            </div>
            <span className="text-gray-700 text-[16px] font-[500] pl-2">{metrics.hcosReferringPatients}</span>
          </div>
          <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between">
            <div className="flex gap-2 items-center">
              <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
              </div>
              <span className="text-gray-500 text-[11px] font-[500]">Avg.Patients Referred per HCO</span>
            </div>
            <span className="text-gray-700 text-[16px] font-[500] pl-2">{metrics.avgPatientsReferredPerHCO}</span>
          </div>
        </div>

        <HCOchart HCOdata={filteredData} />

        <div className="flex flex-col bg-white rounded-xl border border-gray-300 w-full shadow-sm">
          <div className="flex gap-2 items-center p-2">
            <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
              <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
            </div>
            <span className="text-gray-500 text-[11px] font-[500]">Top 10 HCOs by SMA Treated Patients Vol</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-blue-200 text-gray-700 text-[10px] font-medium">
                  <th className="p-2 text-left">HCO Name</th>
                  <th className="p-2 text-left">HCO MDM</th>
                  <th className="p-2 text-right">Treated pat. Vol</th>
                </tr>
              </thead>
              <tbody>
                {metrics.topHCOs.map((hco, index) => (
                  <tr key={index} className="border-t text-gray-800 text-[9px]">
                    <td onClick={() => getHCODetails(hco.id)} className="p-2 cursor-pointer">
                      {hco.name}
                    </td>
                    <td className="p-2">{hco.id}</td>
                    <td className="p-2 text-right">{hco.volume}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// Add the missing constant for state abbreviation to full name mapping
const ABBR_TO_STATE = {
  AL: "ALABAMA",
  AK: "ALASKA",
  AZ: "ARIZONA",
  AR: "ARKANSAS",
  CA: "CALIFORNIA",
  CO: "COLORADO",
  CT: "CONNECTICUT",
  DE: "DELAWARE",
  FL: "FLORIDA",
  GA: "GEORGIA",
  HI: "HAWAII",
  ID: "IDAHO",
  IL: "ILLINOIS",
  IN: "INDIANA",
  IA: "IOWA",
  KS: "KANSAS",
  KY: "KENTUCKY",
  LA: "LOUISIANA",
  ME: "MAINE",
  MD: "MARYLAND",
  MA: "MASSACHUSETTS",
  MI: "MICHIGAN",
  MN: "MINNESOTA",
  MS: "MISSISSIPPI",
  MO: "MISSOURI",
  MT: "MONTANA",
  NE: "NEBRASKA",
  NV: "NEVADA",
  NH: "NEW HAMPSHIRE",
  NJ: "NEW JERSEY",
  NM: "NEW MEXICO",
  NY: "NEW YORK",
  NC: "NORTH CAROLINA",
  ND: "NORTH DAKOTA",
  OH: "OHIO",
  OK: "OKLAHOMA",
  OR: "OREGON",
  PA: "PENNSYLVANIA",
  RI: "RHODE ISLAND",
  SC: "SOUTH CAROLINA",
  SD: "SOUTH DAKOTA",
  TN: "TENNESSEE",
  TX: "TEXAS",
  UT: "UTAH",
  VT: "VERMONT",
  VA: "VIRGINIA",
  WA: "WASHINGTON",
  WV: "WEST VIRGINIA",
  WI: "WISCONSIN",
  WY: "WYOMING",
  DC: "DISTRICT OF COLUMBIA",
}

export default Overview

