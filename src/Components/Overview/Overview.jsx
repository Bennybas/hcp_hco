import React, { useState, useEffect } from 'react';
import { FaUserDoctor } from "react-icons/fa6";
import PrescriberClusterChart from './PrescriberChart';
import HCOchart from './HCOchart';
import USAMap from './Map';
import { useNavigate } from 'react-router-dom';
const Overview = () => {

    const navigate = useNavigate();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
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
        topHCOs: []
    });

    useEffect(() => {
        // Check if we have cached data in localStorage
        const cachedData = localStorage.getItem('overviewData');
        const cachedMetrics = localStorage.getItem('overviewMetrics');
        const cacheTimestamp = localStorage.getItem('overviewCacheTimestamp');
        
        // Use cached data if available and not expired (24 hours)
        const now = new Date().getTime();
        const cacheValid = cacheTimestamp && (now - parseInt(cacheTimestamp)) < 24 * 60 * 60 * 1000;
        
        if (cachedData && cachedMetrics && cacheValid) {
            setData(JSON.parse(cachedData));
            setMetrics(JSON.parse(cachedMetrics));
            setLoading(false);
        } else {
            fetchData();
        }
    }, []);

    const fetchData = async () => {
        try {
            const response = await fetch('http://127.0.0.1:5000/fetch-data');
            const jsonData = await response.json();
            console.log("fetching data:", jsonData);
            setData(jsonData);
            
            // Calculate metrics from fetched data
            calculateMetrics(jsonData);
            
            // Cache the data, metrics, and timestamp in localStorage
            localStorage.setItem('overviewData', JSON.stringify(jsonData));
            localStorage.setItem('overviewCacheTimestamp', new Date().getTime().toString());
            
            setLoading(false);
        } catch (error) {
            console.error("Error fetching data:", error);
            setLoading(false);
        }
    };

    const calculateMetrics = (data) => {
        // Count unique HCPs, patients, and HCOs
        const uniqueHCPs = new Set(data.map(item => item.hcp_id));
        const uniquePatients = new Set(data.map(item => item.patient_id));
        const uniqueHCOs = new Set(data.map(item => item.hco_mdm));
        
        // Count Zolgemsma prescribers (HCPs where zolg_prescriber='Yes')
        const zolgemsmaHCPs = new Set(
            data.filter(item => item.zolg_prescriber === "Yes")
                .map(item => item.hcp_id)
        );
        const zolgemsmaCount = zolgemsmaHCPs.size;
        
        // Count HCPs and HCOs that have Zolgemsma prescribers
        const hcosWithZolgemsma = new Set(
            data.filter(item => item.zolg_prescriber === "Yes")
                .map(item => item.hco_mdm)
        );
        
        // Calculate patient counts per HCP
        const hcpPatientMap = new Map();
        data.forEach(item => {
            if (!hcpPatientMap.has(item.hcp_id)) {
                hcpPatientMap.set(item.hcp_id, new Set());
            }
            hcpPatientMap.get(item.hcp_id).add(item.patient_id);
        });
        
        // Calculate patient counts per HCO
        const hcoPatientMap = new Map();
        data.forEach(item => {
            if (!hcoPatientMap.has(item.hco_mdm)) {
                hcoPatientMap.set(item.hco_mdm, new Set());
            }
            hcoPatientMap.get(item.hco_mdm).add(item.patient_id);
        });
        
        // Get referring HCPs and HCOs
        const referringHCPs = new Set();
        const referringHCOs = new Set();
        data.forEach(item => {
            if (item.ref_npi && item.ref_npi !== "-") {
                referringHCPs.add(item.hcp_id);
                referringHCOs.add(item.hco_mdm);
            }
        });
        
        // Calculate average patients per HCP (SQL equivalent logic)
        const patientCountsPerHCP = Array.from(hcpPatientMap.values())
            .map(patientSet => patientSet.size);
        
        const avgPatientsPerHCP = patientCountsPerHCP.length > 0
            ? patientCountsPerHCP.reduce((sum, count) => sum + count, 0) / patientCountsPerHCP.length
            : 0;
        
        // Calculate average patients per HCO (SQL equivalent logic)
        const patientCountsPerHCO = Array.from(hcoPatientMap.values())
            .map(patientSet => patientSet.size);
        
        const avgPatientsPerHCO = patientCountsPerHCO.length > 0
            ? patientCountsPerHCO.reduce((sum, count) => sum + count, 0) / patientCountsPerHCO.length
            : 0;
        
        // Calculate Top HCPs by patient volume
        const hcpVolume = Array.from(hcpPatientMap.entries()).map(([hcpId, patients]) => {
            const hcp = data.find(item => item.hcp_id === hcpId);
            return {
                name: hcp ? hcp.hcp_name : `HCP ${hcpId}`,
                volume: patients.size
            };
        });
        
        const topHCPs = hcpVolume
            .sort((a, b) => b.volume - a.volume)
            .slice(0, 10);
        
        // Calculate Top HCOs by patient volume
        const hcoVolume = Array.from(hcoPatientMap.entries()).map(([hcoId, patients]) => {
            const hco = data.find(item => item.hco_mdm === hcoId);
            return {
                name: hco && hco.hco_mdm_name !== '-' ? hco.hco_mdm_name : 'Unknown',
                volume: patients.size
            };
        });
        
        const topHCOs = hcoVolume
            .sort((a, b) => b.volume - a.volume)
            .slice(0, 10);
        
        // Set metrics
        const updatedMetrics = {
            totalHCPs: uniqueHCPs.size,
            totalPatients: uniquePatients.size,
            // Using zolgemsmaHCPs count as avgTreatingHCPs, as per your instructions
            avgTreatingHCPs: zolgemsmaHCPs.size,
            avgPatientsPerHCP: Math.round(avgPatientsPerHCP * 10) / 10,
            hcpsReferringPatients: referringHCPs.size,
            avgPatientsReferredPerHCP: Math.round((referringHCPs.size > 0 ? uniquePatients.size / referringHCPs.size : 0) * 10) / 10,
            totalHCOs: uniqueHCOs.size,
            zolgemsmaEver: zolgemsmaCount,
            // Using hcosWithZolgemsma count as avgTreatingHCOs, as per your instructions
            avgTreatingHCOs: hcosWithZolgemsma.size,
            avgPatientsPerHCO: Math.round(avgPatientsPerHCO * 10) / 10,
            hcosReferringPatients: referringHCOs.size,
            avgPatientsReferredPerHCO: Math.round((referringHCOs.size > 0 ? uniquePatients.size / referringHCOs.size : 0) * 10) / 10,
            topHCPs,
            topHCOs
        };
        
        setMetrics(updatedMetrics);
        
        // Cache the calculated metrics
        localStorage.setItem('overviewMetrics', JSON.stringify(updatedMetrics));
    };
    const getHCPDetails = async (hcpName) => {
        navigate('/hcp-hco', { state: { hcp_name: hcpName } });
        const response = await fetch(`http://127.0.0.1:5000/fetch-data?hcp_name=${encodeURIComponent(hcpName)}`);
        const data = await response.json();
        console.log(data);
    };
    
    if (loading) {
        return  <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">Loading data...</span>
      </div>
    }

    return (
        <div className='flex gap-4 w-full p-2'>
            <div className='flex flex-col w-[29%] gap-2'>
                <div className='grid grid-cols-2 gap-2'> 
                    <div className='flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between'>
                        <div className='flex gap-2 items-center'>
                            <div className='bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center'>
                                <FaUserDoctor className='text-[#004567] h-[0.8rem] w-[0.8rem]'/>
                            </div>
                            <span className='text-gray-500 text-[11px] font-[500]'>
                                Total HCPs
                            </span>
                        </div>
                        <span className='text-gray-700 text-[16px] font-[500] pl-2'>
                            {metrics.totalHCPs}
                        </span>
                    </div>
                    <div className='flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between'>
                        <div className='flex gap-2 items-center'>
                            <div className='bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center'>
                                <FaUserDoctor className='text-[#004567] h-[0.8rem] w-[0.8rem]'/>
                            </div>
                            <span className='text-gray-500 text-[11px] font-[500]'>
                                Total Treated Patients
                            </span>
                        </div>
                        <span className='text-gray-700 text-[16px] font-[500] pl-2'>
                            {metrics.totalPatients}
                        </span>
                    </div>
                    <div className='flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between'>
                        <div className='flex gap-2 items-center'>
                            <div className='bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center'>
                                <FaUserDoctor className='text-[#004567] h-[0.8rem] w-[0.8rem]'/>
                            </div>
                            <span className='text-gray-500 text-[11px] font-[500]'>
                                Average Treating HCPs
                            </span>
                        </div>
                        <span className='text-gray-700 text-[16px] font-[500] pl-2'>
                            {metrics.avgTreatingHCPs}
                        </span>
                    </div>
                    <div className='flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between'>
                        <div className='flex gap-2 items-center'>
                            <div className='bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center'>
                                <FaUserDoctor className='text-[#004567] h-[0.8rem] w-[0.8rem]'/>
                            </div>
                            <span className='text-gray-500 text-[11px] font-[500]'>
                                Avg.Patients per HCPs
                            </span>
                        </div>
                        <span className='text-gray-700 text-[16px] font-[500] pl-2'>
                            {metrics.avgPatientsPerHCP}
                        </span>
                    </div>
                    <div className='flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between'>
                        <div className='flex gap-2 items-center'>
                            <div className='bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center'>
                                <FaUserDoctor className='text-[#004567] h-[0.8rem] w-[0.8rem]'/>
                            </div>
                            <span className='text-gray-500 text-[11px] font-[500]'>
                                HCPs Referring Patients
                            </span>
                        </div>
                        <span className='text-gray-700 text-[16px] font-[500] pl-2'>
                            {metrics.hcpsReferringPatients}
                        </span>
                    </div>
                    <div className='flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between'>
                        <div className='flex gap-2 items-center'>
                            <div className='bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center'>
                                <FaUserDoctor className='text-[#004567] h-[0.8rem] w-[0.8rem]'/>
                            </div>
                            <span className='text-gray-500 text-[11px] font-[500]'>
                                Avg.Patients Referred per HCP
                            </span>
                        </div>
                        <span className='text-gray-700 text-[16px] font-[500] pl-2'>
                            {metrics.avgPatientsReferredPerHCP}
                        </span>
                    </div>
                </div>

                <PrescriberClusterChart hcpData={data} />

                <div className="flex flex-col bg-white rounded-xl border border-gray-300 w-full shadow-sm">
                    <div className="flex gap-2 items-center p-2">
                        <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                            <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
                        </div>
                        <span className="text-gray-500 text-[11px] font-[500]">
                            Top 10 HCPs by SMA Treated Patients Vol
                        </span>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-blue-200 text-gray-700 text-[10px] font-medium">
                                    <th className="p-2 text-left">HCP Name</th>
                                    <th className="p-2 text-right">Treated pat. Vol</th>
                                </tr>
                            </thead>
                            <tbody>
                                {metrics.topHCPs.map((hcp, index) => (
                                    <tr key={index} className="border-t text-gray-800 text-[9px]">
                                        <td onClick={() => getHCPDetails(hcp.id)} 
                                           className="p-2 cursor-pointer">{hcp.name}</td>
                                        <td className="p-2 text-right">{hcp.volume}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className='flex flex-col w-[42%]'>
                {/* <USAMap data={data} /> */}
            </div>

            <div className='flex flex-col w-[29%] gap-2'>
                <div className='grid grid-cols-2 gap-2'> 
                    <div className='flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between'>
                        <div className='flex gap-2 items-center'>
                            <div className='bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center'>
                                <FaUserDoctor className='text-[#004567] h-[0.8rem] w-[0.8rem]'/>
                            </div>
                            <span className='text-gray-500 text-[11px] font-[500]'>
                                Total HCOs
                            </span>
                        </div>
                        <span className='text-gray-700 text-[16px] font-[500] pl-2'>
                            {metrics.totalHCOs}
                        </span>
                    </div>
                    <div className='flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between'>
                        <div className='flex gap-2 items-center'>
                            <div className='bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center'>
                                <FaUserDoctor className='text-[#004567] h-[0.8rem] w-[0.8rem]'/>
                            </div>
                            <span className='text-gray-500 text-[11px] font-[500]'>
                                Zolgemsma Ever
                            </span>
                        </div>
                        <span className='text-gray-700 text-[16px] font-[500] pl-2'>
                            {metrics.zolgemsmaEver}
                        </span>
                    </div>
                    <div className='flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between'>
                        <div className='flex gap-2 items-center'>
                            <div className='bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center'>
                                <FaUserDoctor className='text-[#004567] h-[0.8rem] w-[0.8rem]'/>
                            </div>
                            <span className='text-gray-500 text-[11px] font-[500]'>
                                Average Treating HCOs
                            </span>
                        </div>
                        <span className='text-gray-700 text-[16px] font-[500] pl-2'>
                            {metrics.avgTreatingHCOs}
                        </span>
                    </div>
                    <div className='flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between'>
                        <div className='flex gap-2 items-center'>
                            <div className='bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center'>
                                <FaUserDoctor className='text-[#004567] h-[0.8rem] w-[0.8rem]'/>
                            </div>
                            <span className='text-gray-500 text-[11px] font-[500]'>
                                Avg.Patients per HCOs
                            </span>
                        </div>
                        <span className='text-gray-700 text-[16px] font-[500] pl-2'>
                            {metrics.avgPatientsPerHCO}
                        </span>
                    </div>
                    <div className='flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between'>
                        <div className='flex gap-2 items-center'>
                            <div className='bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center'>
                                <FaUserDoctor className='text-[#004567] h-[0.8rem] w-[0.8rem]'/>
                            </div>
                            <span className='text-gray-500 text-[11px] font-[500]'>
                                HCOs Referring Patients
                            </span>
                        </div>
                        <span className='text-gray-700 text-[16px] font-[500] pl-2'>
                            {metrics.hcosReferringPatients}
                        </span>
                    </div>
                    <div className='flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-20 p-2 justify-between'>
                        <div className='flex gap-2 items-center'>
                            <div className='bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center'>
                                <FaUserDoctor className='text-[#004567] h-[0.8rem] w-[0.8rem]'/>
                            </div>
                            <span className='text-gray-500 text-[11px] font-[500]'>
                                Avg.Patients Referred per HCO
                            </span>
                        </div>
                        <span className='text-gray-700 text-[16px] font-[500] pl-2'>
                            {metrics.avgPatientsReferredPerHCO}
                        </span>
                    </div>
                </div>

                <HCOchart HCOdata={data} />

                <div className="flex flex-col bg-white rounded-xl border border-gray-300 w-full shadow-sm">
                    <div className="flex gap-2 items-center p-2">
                        <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                            <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
                        </div>
                        <span className="text-gray-500 text-[11px] font-[500]">
                            Top 10 HCOs by SMA Treated Patients Vol
                        </span>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-blue-200 text-gray-700 text-[10px] font-medium">
                                    <th className="p-2 text-left">HCO Name</th>
                                    <th className="p-2 text-right">Treated pat. Vol</th>
                                </tr>
                            </thead>
                            <tbody>
                                {metrics.topHCOs.map((hco, index) => (
                                    <tr key={index} className="border-t text-gray-800 text-[9px]">
                                       <button 
                                            
                                            className="p-2 cursor-pointer"
                                        >
                                            {hco.name}
                                        </button>
                                        <td className="p-2 text-right">{hco.volume}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Overview;