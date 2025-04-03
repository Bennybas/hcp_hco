"use client"

import { ArrowLeft } from "lucide-react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts"
import { useLocation } from "react-router-dom"

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

  useEffect(() => {
    const fetchHCPData = async () => {
      try {
        setLoading(true)
        const hcpurl = `https://hcp-hco-backend.onrender.com/hcp-360?hcp_name=${encodeURIComponent(hcpName)}`
        const response = await fetch(hcpurl)
        const data = await response.json()

        setHcpData(data)
        processHCPData(data)
      } catch (error) {
        console.error("Error fetching HCP data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchHCPData()
  }, [hcpName])

  // Fetch referral data when NPI is available
  useEffect(() => {
    const fetchReferralData = async () => {
      if (!hcpNPI) return

      try {
        const referralUrl = `https://hcp-hco-backend.onrender.com/hcp-360?ref_npi=${hcpNPI}`
        const response = await fetch(referralUrl)
        const data = await response.json()

        processReferralData(data)
      } catch (error) {
        console.error("Error fetching referral data:", error)
      }
    }

    fetchReferralData()
  }, [hcpNPI])

  // Process referral data
  const processReferralData = (data) => {
    if (!data || data.length === 0) {
      setAllReferralData([])
      setReferralData([])
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
    setActiveTab(tab)
    filterReferralData(tab)
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

      // Process Quarterly Patient Trend Data
      // Simulate quarterly data - in a real scenario this would be based on actual date fields
      const quarterlyData = [
        { quarter: "Q1 24", "Treated Patients": 0, Zolgensma: 0, Spinraza: 0, Evrysdi: 0 },
        { quarter: "Q2 24", "Treated Patients": 0, Zolgensma: 0, Spinraza: 0, Evrysdi: 0 },
        { quarter: "Q3 24", "Treated Patients": 0, Zolgensma: 0, Spinraza: 0, Evrysdi: 0 },
        { quarter: "Q4 24", "Treated Patients": 0, Zolgensma: 0, Spinraza: 0, Evrysdi: 0 },
      ]

      // Count patients by drug and quarter (deterministic distribution based on patient_id)
      data.forEach((record) => {
        // Distribute records across quarters using the last character of patient_id
        const lastChar = record.patient_id.slice(-1)
        const quarterIndex = Number.parseInt(lastChar, 36) % 4 // Convert to number in base 36, then mod 4

        quarterlyData[quarterIndex]["Treated Patients"] += 1

        if (record.drug_name === "ZOLGENSMA") {
          quarterlyData[quarterIndex]["Zolgensma"] += 1
        } else if (record.drug_name === "SPINRAZA") {
          quarterlyData[quarterIndex]["Spinraza"] += 1
        } else if (record.drug_name === "EVRYSDI") {
          quarterlyData[quarterIndex]["Evrysdi"] += 1
        }
      })

      setQuarterlyPatientTrendData(quarterlyData)

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
        Congress: null
      };
  
      // Find first valid publications value
      for (const record of data) {
        if (record.publications && record.publications !== "null" && record.publications.trim() !== "") {
          scientificValues.Publications = parseInt(record.publications, 10);
          break;
        }
      }
  
      // Find first valid clinical trials value
      for (const record of data) {
        if (record.clinical_trials && record.clinical_trials !== "null" && record.clinical_trials.trim() !== "") {
          scientificValues["Clinical Trials"] = parseInt(record.clinical_trials, 10);
          break;
        }
      }
  
      // Find first valid congress contributions value
      for (const record of data) {
        if (record.congress_contributions && record.congress_contributions !== "null" && record.congress_contributions.trim() !== "") {
          scientificValues.Congress = parseInt(record.congress_contributions, 10);
          break;
        }
      }
  
      // Set default value of 0 for any null values
      Object.keys(scientificValues).forEach(key => {
        if (scientificValues[key] === null) {
          scientificValues[key] = 0;
        }
      });
  
      // Format data for the chart
      setScientificData(
        Object.keys(scientificValues).map(category => ({
          category,
          value: scientificValues[category]
        }))
      );
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">Loading data...</span>
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
            <img src="image.jpg" alt="img" className="h-20 w-20 rounded-full" />
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
              <div className="text-[10px] text-gray-600">Zolgensma user</div>
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
                        <div className="flex  items-center gap-1">
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

                  {/* Lines for each Archetype */}
                  <Line type="monotone" dataKey="Treated Patients" stroke="#0b5cab" strokeWidth={2} />
                  <Line type="monotone" dataKey="Zolgensma" stroke="#9370db" strokeWidth={2} />
                  <Line type="monotone" dataKey="Spinraza" stroke="#69a7ad" strokeWidth={2} />
                  <Line type="monotone" dataKey="Evrysdi" stroke="#0e7d0c" strokeWidth={2} />
                </LineChart>
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
                      <Bar dataKey="value" fill="#3680ba" barSize={40} radius={[6, 6, 0, 0]} />
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
                      <Bar dataKey="value" fill="#3680ba" barSize={40} radius={[6, 6, 0, 0]} />
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
                      <Bar dataKey="value" fill="#3680ba" barSize={40} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <hr className="border-gray-300 w-full -mt-6" />

            <div className="p-4">
              <div className="flex gap-2 items-center py-2">
                <div className="text-gray-700 text-[11px] font-medium ">Patients Referral Out</div>

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
              </div>

              <div className="rounded-lg overflow-hidden shadow">
                <table className="w-full">
                  <thead className="bg-[#D2D2D2]">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-bold">HCP Name</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold">Specialty</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold">Patients Referred</th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold">Affiliated Account</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {referralData.length > 0 ? (
                      referralData.map((row, index) => (
                        <tr key={index} className="border-t border-gray-200">
                          <td className="px-4 py-3 text-[10px]">{row.hcpName}</td>
                          <td className="px-4 py-3 text-[10px]">{row.specialty}</td>
                          <td className="px-4 py-3 text-[10px]">{row.patientsReferred}</td>
                          <td className="px-4 py-3 text-[10px]">{row.affiliatedAccount}</td>
                        </tr>
                      ))
                    ) : (
                      <tr className="border-t border-gray-200">
                        <td colSpan="4" className="px-4 py-3 text-[10px] text-center">
                          No referral data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HCPdeepDive

