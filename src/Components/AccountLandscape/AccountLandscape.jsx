import React from 'react'
import { FaUserDoctor } from 'react-icons/fa6'
import {MoveUpRight} from 'lucide-react'
import {  PieChart, Pie, Cell,BarChart, Bar,LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,Legend } from 'recharts';
import { ComposableMap, Geographies, Geography } from "react-simple-maps";


const AccountLandscape = () => {


    // Data estimated visually from the line chart image.
const patientTrendData = [
    { month: 'Jan 24', 'Archetype 1': 70, 'Archetype 2': 44, 'Archetype 3': 48 },
    { month: 'Feb 24', 'Archetype 1': 85, 'Archetype 2': 38, 'Archetype 3': 57 },
    { month: 'Mar 24', 'Archetype 1': 70, 'Archetype 2': 47, 'Archetype 3': 70 },
    { month: 'Apr 24', 'Archetype 1': 82, 'Archetype 2': 62, 'Archetype 3': 56 },
    { month: 'May 24', 'Archetype 1': 75, 'Archetype 2': 55, 'Archetype 3': 82 },
    { month: 'Jun 24', 'Archetype 1': 56, 'Archetype 2': 34, 'Archetype 3': 72 },
    { month: 'Jul 24', 'Archetype 1': 78, 'Archetype 2': 58, 'Archetype 3': 44 },
    { month: 'Aug 24', 'Archetype 1': 97, 'Archetype 2': 68, 'Archetype 3': 68 },
    { month: 'Sep 24', 'Archetype 1': 70, 'Archetype 2': 84, 'Archetype 3': 58 },
    { month: 'Oct 24', 'Archetype 1': 82, 'Archetype 2': 68, 'Archetype 3': 65 },
    { month: 'Nov 24', 'Archetype 1': 91, 'Archetype 2': 60, 'Archetype 3': 72 },
    { month: 'Dec 24', 'Archetype 1': 75, 'Archetype 2': 56, 'Archetype 3': 41 }
  ];

  const facilityTypeData = [
    { name: 'Current IV', value: 275, color: '#00599D' },
    { name: 'IV Affiliates', value: 600, color: '#6A99B5' },
    { name: 'New IT Treatment Centers', value: 650, color: '#7DFFA8' },
    { name: 'Unspecified', value: 975, color: '#F0C3F7' },
    { name: 'New Treatment Centers', value: 975, color: '#C8E3F5' }
  ];

      
      const potential_data = [
        { label: 'Tier 1', value: 35, color: '#B073FE' },
        { label: 'Tier 2', value: 20, color: '#FDBA74' }, 
        { label: 'Tier 3', value: 16, color: '#B4F06C' }, 
        { label: 'Tier 4', value: 34, color: '#6EE79A' } 
      ];
      const maxValue = Math.max(...potential_data.map(item => item.value), 0);

      const accountTableData = [
        {
          Rank: '01',
          'Account ID': '564511441',
          'No. HCPs': 536,
          'SMA. Patients': 645, // Assuming "SMA." is part of the header
          'Affiliated Account': "Le Bonheur Children's Hospital",
          'Account Tier': 'Tier 2',
          'Account Archetype': 'Affiliated IV Site'
        },
        {
          Rank: '02',
          'Account ID': '48484684',
          'No. HCPs': 346,
          'SMA. Patients': 872,
          'Affiliated Account': 'UT Southwestern Medical Center At Dallas',
          'Account Tier': 'Tier 3',
          'Account Archetype': 'Current IV Site'
        },
        {
          Rank: '03',
          'Account ID': '565465151',
          'No. HCPs': 145,
          'SMA. Patients': 219,
          'Affiliated Account': 'UCSF Medical Center Pediatric Allergy And Immunology',
          'Account Tier': 'Tier 4',
          'Account Archetype': 'Adult Convenience'
        },
        {
          Rank: '04',
          'Account ID': '1216531515',
          'No. HCPs': 49,
          'SMA. Patients': 621,
          'Affiliated Account': 'Saint Josephs Health Division Of Neurology',
          'Account Tier': 'Tier 2',
          'Account Archetype': 'Affiliated IV Site'
        },
        {
          Rank: '05',
          'Account ID': '325613414',
          'No. HCPs': 807,
          'SMA. Patients': 883,
          'Affiliated Account': 'Chop Care Network Specialty Care In Voorhees', // Note: Might be "Specialty"
          'Account Tier': 'Tier 3',
          'Account Archetype': 'Current IV Site'
        }
      ];

      const healthcareData = {
        "01": { abbr: "AL", patients: 127, hcps: 45, adoptionRate: 68 },
        "02": { abbr: "AK", patients: 25, hcps: 12, adoptionRate: 55 },
        "04": { abbr: "AZ", patients: 192, hcps: 83, adoptionRate: 72 },
        "05": { abbr: "AR", patients: 95, hcps: 37, adoptionRate: 65 },
        "06": { abbr: "CA", patients: 873, hcps: 264, adoptionRate: 82 },
        "08": { abbr: "CO", patients: 177, hcps: 67, adoptionRate: 75 },
        "09": { abbr: "CT", patients: 128, hcps: 51, adoptionRate: 73 },
        "10": { abbr: "DE", patients: 31, hcps: 16, adoptionRate: 69 },
        "11": { abbr: "DC", patients: 24, hcps: 15, adoptionRate: 71 },
        "12": { abbr: "FL", patients: 640, hcps: 221, adoptionRate: 78 },
        "13": { abbr: "GA", patients: 274, hcps: 95, adoptionRate: 74 },
        "15": { abbr: "HI", patients: 54, hcps: 21, adoptionRate: 62 },
        "16": { abbr: "ID", patients: 58, hcps: 28, adoptionRate: 67 },
        "17": { abbr: "IL", patients: 391, hcps: 136, adoptionRate: 76 },
        "18": { abbr: "IN", patients: 247, hcps: 83, adoptionRate: 71 },
        "19": { abbr: "IA", patients: 143, hcps: 56, adoptionRate: 69 },
        "20": { abbr: "KS", patients: 129, hcps: 47, adoptionRate: 66 },
        "21": { abbr: "KY", patients: 167, hcps: 62, adoptionRate: 68 },
        "22": { abbr: "LA", patients: 186, hcps: 73, adoptionRate: 64 },
        "23": { abbr: "ME", patients: 62, hcps: 24, adoptionRate: 70 },
        "24": { abbr: "MD", patients: 245, hcps: 92, adoptionRate: 74 },
        "25": { abbr: "MA", patients: 293, hcps: 104, adoptionRate: 80 },
        "26": { abbr: "MI", patients: 373, hcps: 135, adoptionRate: 75 },
        "27": { abbr: "MN", patients: 206, hcps: 78, adoptionRate: 76 },
        "28": { abbr: "MS", patients: 104, hcps: 38, adoptionRate: 63 },
        "29": { abbr: "MO", patients: 234, hcps: 88, adoptionRate: 70 },
        "30": { abbr: "MT", patients: 48, hcps: 19, adoptionRate: 61 },
        "31": { abbr: "NE", patients: 83, hcps: 34, adoptionRate: 67 },
        "32": { abbr: "NV", patients: 153, hcps: 58, adoptionRate: 71 },
        "33": { abbr: "NH", patients: 57, hcps: 23, adoptionRate: 74 },
        "34": { abbr: "NJ", patients: 382, hcps: 138, adoptionRate: 77 },
        "35": { abbr: "NM", patients: 88, hcps: 32, adoptionRate: 68 },
        "36": { abbr: "NY", patients: 672, hcps: 241, adoptionRate: 81 },
        "37": { abbr: "NC", patients: 358, hcps: 129, adoptionRate: 76 },
        "38": { abbr: "ND", patients: 37, hcps: 15, adoptionRate: 65 },
        "39": { abbr: "OH", patients: 421, hcps: 148, adoptionRate: 73 },
        "40": { abbr: "OK", patients: 163, hcps: 63, adoptionRate: 69 },
        "41": { abbr: "OR", patients: 147, hcps: 59, adoptionRate: 72 },
        "42": { abbr: "PA", patients: 523, hcps: 187, adoptionRate: 78 },
        "44": { abbr: "RI", patients: 43, hcps: 18, adoptionRate: 74 },
        "45": { abbr: "SC", patients: 174, hcps: 64, adoptionRate: 70 },
        "46": { abbr: "SD", patients: 43, hcps: 17, adoptionRate: 66 },
        "47": { abbr: "TN", patients: 238, hcps: 89, adoptionRate: 72 },
        "48": { abbr: "TX", patients: 812, hcps: 283, adoptionRate: 79 },
        "49": { abbr: "UT", patients: 101, hcps: 40, adoptionRate: 71 },
        "50": { abbr: "VT", patients: 26, hcps: 12, adoptionRate: 68 },
        "51": { abbr: "VA", patients: 316, hcps: 115, adoptionRate: 74 },
        "53": { abbr: "WA", patients: 231, hcps: 89, adoptionRate: 75 },
        "54": { abbr: "WV", patients: 58, hcps: 22, adoptionRate: 64 },
        "55": { abbr: "WI", patients: 198, hcps: 76, adoptionRate: 72 },
        "56": { abbr: "WY", patients: 29, hcps: 13, adoptionRate: 63 }
      };
  return (
    <div className='flex flex-col gap-4 w-full p-2'>
        <div className='flex gap-4 w-full'>
            <div className='flex flex-col bg-white rounded-xl border-b border-x  border-gray-300 w-[20%] h-20 p-2 justify-between'>
                <div className='flex gap-2 items-center'>
                    <div className='bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center'>
                        <FaUserDoctor className='text-[#004567] h-[0.8rem] w-[0.8rem]'/>
                    </div>
                    <span className='text-gray-500 text-[11px] font-[500]'>
                        Rendering HCOs
                    </span>
                </div>
                <span className='text-gray-700 text-[16px] font-[500] pl-2'>
                        2550
                </span>
            </div>
            <div className='flex flex-col bg-white rounded-xl border-b border-x  border-gray-300 w-[20%] h-20 p-2 justify-between'>
                <div className="flex flex-col justify-between h-full">
                    <div className='flex gap-2 items-center'>
                        <div className='bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center'>
                            <FaUserDoctor className='text-[#004567] h-[0.8rem] w-[0.8rem]'/>
                        </div>
                        <span className='text-gray-500 text-[11px] font-[500]'>SMA Patients Treated in Last 12M</span>
                    </div>
                   
                    <div className="flex items-center gap-1">
                        <span className="text-gray-700 text-[16px] font-[500]">240</span>
                        <MoveUpRight className="text-green-500 ml-2" style={{ width: '10px', height: '10px' }} />
                        <span className="text-green-500 text-xs">5.2%</span>
                        <span className="text-gray-500 text-xs">vs last month</span>
                    </div>
                </div>
            </div>

            <div className='flex flex-col bg-white rounded-xl border-b border-x  border-gray-300 w-[20%] h-20 p-2 justify-between'>
                <div className='flex gap-2 items-center'>
                    <div className='bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center'>
                        <FaUserDoctor className='text-[#004567] h-[0.8rem] w-[0.8rem]'/>
                    </div>
                    <span className='text-gray-500 text-[11px] font-[500]'>
                       Avg #Pats Treated per HCOs
                    </span>
                </div>
                <span className='text-gray-700 text-[16px] font-[500] pl-2'>
                        5.5
                </span>
            </div>

            <div className='flex flex-col bg-white rounded-xl border-b border-x  border-gray-300 w-[20%] h-20 p-2 justify-between'>
                <div className='flex gap-2 items-center'>
                    <div className='bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center'>
                        <FaUserDoctor className='text-[#004567] h-[0.8rem] w-[0.8rem]'/>
                    </div>
                    <span className='text-gray-500 text-[11px] font-[500]'>
                    SMA Patients Referred in Last 12M
                    </span>
                </div>
                <span className='text-gray-700 text-[16px] font-[500] pl-2'>
                        3,567
                </span>
            </div>

            <div className='flex flex-col bg-white rounded-xl border-b border-x  border-gray-300 w-[20%] h-20 p-2 justify-between'>
                <div className='flex gap-2 items-center'>
                    <div className='bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center'>
                        <FaUserDoctor className='text-[#004567] h-[0.8rem] w-[0.8rem]'/>
                    </div>
                    <span className='text-gray-500 text-[11px] font-[500]'>
                       Avg #Pats Referred per HCOs
                    </span>
                </div>
                <span className='text-gray-700 text-[16px] font-[500] pl-2'>
                        2.1
                </span>
            </div>
        </div>
        <div className="flex gap-4 w-full">
            <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[60%] h-56 p-2">
                <span className="text-gray-500 text-[11px] font-[500] pb-4">
                    #MoM SMA Treated Patients by Archetype
                </span>
                <ResponsiveContainer width="100%" height="90%">
                    <LineChart data={patientTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ fontSize: 10 }} itemStyle={{ fontSize: 10 }} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        
                        {/* Lines for each Archetype */}
                        <Line type="monotone" dataKey="Archetype 1" stroke="#0b5cab" strokeWidth={2} />
                        <Line type="monotone" dataKey="Archetype 2" stroke="#9370db" strokeWidth={2} />
                        <Line type="monotone" dataKey="Archetype 3" stroke="#69a7ad" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[40%] h-56 p-2">
                <div className='flex gap-2 items-center justify-between w-full pb-4'>
                    <span className='text-gray-500 text-[11px] font-[500]'>
                    Accounts by Facility Type
                    </span>
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
                    <Tooltip  contentStyle={{ fontSize: 10 }} itemStyle={{ fontSize: 10 }} />
                    <Legend 
                        layout="vertical" 
                        align="right" 
                        verticalAlign="middle" 
                        wrapperStyle={{ fontSize: '10px' }}
                        formatter={(value, entry, index) => (
                            <span style={{ marginBottom: '4px', display: 'inline-block' }}>{value}</span>
                        )}
                    />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="flex gap-4 w-full">
            <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[40%] h-60 p-2">
               
                <span className="text-gray-500 text-[11px] font-[500] pb-4">
                  HCO Tier by SMA Patients Potential
                </span>
                <div className="flex flex-col space-y-3 flex-grow justify-around pr-2">
                    {potential_data.map((item, index) => (
                    <div key={index} className="flex flex-col items-center w-full">
                        <div className='flex items-center w-full'>
                            <span className="text-gray-500 text-[10px] w-[120px] shrink-0 mr-2">{item.label}</span> 
                        </div>
                        <div className='flex items-center w-full'>
                            <div className="flex-grow bg-gray-100 rounded-full h-[6px] mr-2"> 
                                <div
                                    className="h-[6px] rounded-full"
                                    style={{
                                    width: `${(item.value / maxValue) * 100}%`,
                                    backgroundColor: item.color
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
                        const stateData = healthcareData[geo.id] || {};
                        return (
                            <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={stateData.adoptionRate > 70 ? "#4f93c0" : "#a6cee3"}
                            stroke="#FFF"
                            />
                        );
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
                <span className="text-gray-500 text-[11px] font-[500]">
                    Accounts List
                </span>
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
                                <td className="p-2">{hco["Account ID"]}</td>
                                <td className="p-2">{hco["No. HCPs"]}</td>
                                <td className="p-2">{hco["SMA. Patients"]}</td>
                                <td className="p-2">{hco["Affiliated Account"]}</td>
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