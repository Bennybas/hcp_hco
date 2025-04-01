import React from 'react'
import { FaUserDoctor } from "react-icons/fa6";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import PrescriberClusterChart from './PrescriberChart';
import HCOchart from './HCOchart';
import Map from './Map';

const Overview = () => {

    const data = [
        { name: "Haylie Ross", volume: 448 },
        { name: "Talan Westervelt", volume: 334 },
        { name: "Lincoln Bergson", volume: 286 },
        { name: "Charlie Workman", volume: 228 }
    ];
  return (
    <div className='flex gap-4 w-full p-2'>
        <div className='flex flex-col w-[29%] gap-2'>
            <div className='grid grid-cols-2 gap-2'> 
                <div className='flex flex-col bg-white rounded-xl border-b border-x  border-gray-300 w-full h-20 p-2 justify-between'>
                    <div className='flex gap-2 items-center'>
                        <div className='bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center'>
                            <FaUserDoctor className='text-[#004567] h-[0.8rem] w-[0.8rem]'/>
                        </div>

                        <span className='text-gray-500 text-[11px] font-[500]'>
                            Total HCPs

                        </span>
                    </div>
                    <span className='text-gray-700 text-[16px] font-[500] pl-2'>
                            5550
                    </span>
                </div>
                <div className='flex flex-col bg-white rounded-xl border-b border-x  border-gray-300 w-full h-20 p-2 justify-between'>
                    <div className='flex gap-2 items-center'>
                        <div className='bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center'>
                            <FaUserDoctor className='text-[#004567] h-[0.8rem] w-[0.8rem]'/>
                        </div>

                        <span className='text-gray-500 text-[11px] font-[500]'>
                            Total Treated Patients

                        </span>
                    </div>
                    <span className='text-gray-700 text-[16px] font-[500] pl-2'>
                            4500
                    </span>
                </div>
                <div className='flex flex-col bg-white rounded-xl border-b border-x  border-gray-300 w-full h-20 p-2 justify-between'>
                    <div className='flex gap-2 items-center'>
                        <div className='bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center'>
                            <FaUserDoctor className='text-[#004567] h-[0.8rem] w-[0.8rem]'/>
                        </div>

                        <span className='text-gray-500 text-[11px] font-[500]'>
                            Average Treating HCPs

                        </span>
                    </div>
                    <span className='text-gray-700 text-[16px] font-[500] pl-2'>
                            1000
                    </span>
                </div>
                <div className='flex flex-col bg-white rounded-xl border-b border-x  border-gray-300 w-full h-20 p-2 justify-between'>
                    <div className='flex gap-2 items-center'>
                        <div className='bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center'>
                            <FaUserDoctor className='text-[#004567] h-[0.8rem] w-[0.8rem]'/>
                        </div>

                        <span className='text-gray-500 text-[11px] font-[500]'>
                            Avg.Patients per HCPs

                        </span>
                    </div>
                    <span className='text-gray-700 text-[16px] font-[500] pl-2'>
                            5.5
                    </span>
                </div>
                <div className='flex flex-col bg-white rounded-xl border-b border-x  border-gray-300 w-full h-20 p-2 justify-between'>
                    <div className='flex gap-2 items-center'>
                        <div className='bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center'>
                            <FaUserDoctor className='text-[#004567] h-[0.8rem] w-[0.8rem]'/>
                        </div>

                        <span className='text-gray-500 text-[11px] font-[500]'>
                            HCPs Referring Patients

                        </span>
                    </div>
                    <span className='text-gray-700 text-[16px] font-[500] pl-2'>
                            3000
                    </span>
                </div>
                <div className='flex flex-col bg-white rounded-xl border-b border-x  border-gray-300 w-full h-20 p-2 justify-between'>
                    <div className='flex gap-2 items-center'>
                        <div className='bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center'>
                            <FaUserDoctor className='text-[#004567] h-[0.8rem] w-[0.8rem]'/>
                        </div>

                        <span className='text-gray-500 text-[11px] font-[500]'>
                            Avg.Patients Referred per HCP

                        </span>
                    </div>
                    <span className='text-gray-700 text-[16px] font-[500] pl-2'>
                            2.0
                    </span>
                </div>
            </div>

            <PrescriberClusterChart />

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

                        {/* Table Body */}
                        <tbody>
                            {data.map((hcp, index) => (
                                <tr key={index} className="border-t text-gray-800 text-[9px]">
                                    <td className="p-2">{hcp.name}</td>
                                    <td className="p-2 text-right">{hcp.volume}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div className='flex flex-col w-[42%]'>
            <Map />

        </div>
        <div className='flex flex-col w-[29%] gap-2'>
            <div className='grid grid-cols-2 gap-2'> 
                <div className='flex flex-col bg-white rounded-xl border-b border-x  border-gray-300 w-full h-20 p-2 justify-between'>
                    <div className='flex gap-2 items-center'>
                        <div className='bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center'>
                            <FaUserDoctor className='text-[#004567] h-[0.8rem] w-[0.8rem]'/>
                        </div>

                        <span className='text-gray-500 text-[11px] font-[500]'>
                            Total HCOs

                        </span>
                    </div>
                    <span className='text-gray-700 text-[16px] font-[500] pl-2'>
                            5550
                    </span>
                </div>
                <div className='flex flex-col bg-white rounded-xl border-b border-x  border-gray-300 w-full h-20 p-2 justify-between'>
                    <div className='flex gap-2 items-center'>
                        <div className='bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center'>
                            <FaUserDoctor className='text-[#004567] h-[0.8rem] w-[0.8rem]'/>
                        </div>

                        <span className='text-gray-500 text-[11px] font-[500]'>
                            Zolgemsma Ever

                        </span>
                    </div>
                    <span className='text-gray-700 text-[16px] font-[500] pl-2'>
                            500
                    </span>
                </div>
                <div className='flex flex-col bg-white rounded-xl border-b border-x  border-gray-300 w-full h-20 p-2 justify-between'>
                    <div className='flex gap-2 items-center'>
                        <div className='bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center'>
                            <FaUserDoctor className='text-[#004567] h-[0.8rem] w-[0.8rem]'/>
                        </div>

                        <span className='text-gray-500 text-[11px] font-[500]'>
                            Average Treating HCOs

                        </span>
                    </div>
                    <span className='text-gray-700 text-[16px] font-[500] pl-2'>
                            1000
                    </span>
                </div>
                <div className='flex flex-col bg-white rounded-xl border-b border-x  border-gray-300 w-full h-20 p-2 justify-between'>
                    <div className='flex gap-2 items-center'>
                        <div className='bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center'>
                            <FaUserDoctor className='text-[#004567] h-[0.8rem] w-[0.8rem]'/>
                        </div>

                        <span className='text-gray-500 text-[11px] font-[500]'>
                            Avg.Patients per HCOs

                        </span>
                    </div>
                    <span className='text-gray-700 text-[16px] font-[500] pl-2'>
                            5.5
                    </span>
                </div>
                <div className='flex flex-col bg-white rounded-xl border-b border-x  border-gray-300 w-full h-20 p-2 justify-between'>
                    <div className='flex gap-2 items-center'>
                        <div className='bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center'>
                            <FaUserDoctor className='text-[#004567] h-[0.8rem] w-[0.8rem]'/>
                        </div>

                        <span className='text-gray-500 text-[11px] font-[500]'>
                            HCOs Referring Patients

                        </span>
                    </div>
                    <span className='text-gray-700 text-[16px] font-[500] pl-2'>
                            3000
                    </span>
                </div>
                <div className='flex flex-col bg-white rounded-xl border-b border-x  border-gray-300 w-full h-20 p-2 justify-between'>
                    <div className='flex gap-2 items-center'>
                        <div className='bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center'>
                            <FaUserDoctor className='text-[#004567] h-[0.8rem] w-[0.8rem]'/>
                        </div>

                        <span className='text-gray-500 text-[11px] font-[500]'>
                            Avg.Patients Referred per HCO

                        </span>
                    </div>
                    <span className='text-gray-700 text-[16px] font-[500] pl-2'>
                            2.0
                    </span>
                </div>
            </div>

            <HCOchart />

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

                        {/* Table Body */}
                        <tbody>
                            {data.map((hcp, index) => (
                                <tr key={index} className="border-t text-gray-800 text-[9px]">
                                    <td className="p-2">{hcp.name}</td>
                                    <td className="p-2 text-right">{hcp.volume}</td>
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

export default Overview