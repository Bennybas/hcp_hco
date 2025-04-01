import React from 'react'
import { FaUserDoctor } from 'react-icons/fa6'
import {MoveUpRight} from 'lucide-react'
import { BarChart, Bar,LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,Legend } from 'recharts';

const HCPlandscape = () => {


    const MoMData = [
        { month: 'Jan 24', value: 420 },
        { month: 'Feb 24', value: 150 },
        { month: 'Mar 24', value: 80 },
        { month: 'Apr 24', value: 100 },
        { month: 'May 24', value: 70 },
        { month: 'Jun 24', value: 120 },
        { month: 'Jul 24', value: 180 },
        { month: 'Aug 24', value: 230 },
        { month: 'Sep 24', value: 140 },
        { month: 'Oct 24', value: 310 },
        { month: 'Nov 24', value: 260 },
        { month: 'Dec 24', value: 210 }
      ];

      const QoQdata = [
        { quarter: "2024 Q1", Zolgensma: 30, Spinraza: 20, Evrysdi: 25 },
        { quarter: "2024 Q2", Zolgensma: 50, Spinraza: 25, Evrysdi: 20 },
        { quarter: "2024 Q3", Zolgensma: 20, Spinraza: 30, Evrysdi: 30 },
        { quarter: "2024 Q4", Zolgensma: 25, Spinraza: 15, Evrysdi: 15 },
        { quarter: "2025 Q1", Zolgensma: 40, Spinraza: 30, Evrysdi: 35 }
      ];

      const hcpsplit_age = [
        { segment: 'High', '<2': 50, '3-17': 25, '>18': 25 },
        { segment: 'Moderate', '<2': 54, '3-17': 26, '>18': 20 },
        { segment: 'Low', '<2': 26, '3-17': 31, '>18': 43 },
        { segment: 'V-Low', '<2': 49, '3-17': 20, '>18': 31 }
      ];
      const hcpsplit_specialty_data = [
        { segment: 'High',   PCP: 25, Pediatric: 17, 'All Others': 18, 'Child Neurology': 10, Neuromuscular: 16, 'NP/PA': 14 },
        { segment: 'Moderate', PCP: 24, Pediatric: 18, 'All Others': 18, 'Child Neurology': 11, Neuromuscular: 15, 'NP/PA': 14 },
        { segment: 'Low',      PCP: 25, Pediatric: 17, 'All Others': 17, 'Child Neurology': 11, Neuromuscular: 17, 'NP/PA': 13 },
        { segment: 'V-Low',    PCP: 25, Pediatric: 18, 'All Others': 17, 'Child Neurology': 10, Neuromuscular: 16, 'NP/PA': 14 },
      ];

      const potential_data = [
        { label: 'High Potential', value: 35, color: '#B073FE' },
        { label: 'Moderate', value: 20, color: '#FDBA74' }, 
        { label: 'Low Potential', value: 16, color: '#B4F06C' }, 
        { label: 'Very Low Potential', value: 34, color: '#6EE79A' } 
      ];
      const maxValue = Math.max(...potential_data.map(item => item.value), 0);

      const table_data = [
        {
          Rank: '01',
          'HCP ID': '1205219995',
          'HCP Name': 'Haylie Ross',
          Specialty: 'Child Neurologist',
          'Affiliated Accounts': 'Le Bonheur Childrens Hospital'
        },
        {
          Rank: '02',
          'HCP ID': '56165165515', 
          'HCP Name': 'Carla Stanton',
          Specialty: 'Pediatrics',
          'Affiliated Accounts': 'UT Southwestern Medical Center At Dallas'
        },
        {
          Rank: '03',
          'HCP ID': '1235465125',
          'HCP Name': 'Maria Korsgaard',
          Specialty: 'Neurology',
          'Affiliated Accounts': 'UCSF Medical Center Pediatric Allergy And Immunology'
        },
        {
          Rank: '04',
          'HCP ID': '1258642231',
          'HCP Name': 'James Vaccaro',
          Specialty: 'General Medicine',
          'Affiliated Accounts': 'Saint Josephs Health Division Of Neurology'
        },
        {
          Rank: '05',
          'HCP ID': '1478641254',
          'HCP Name': 'Ruben Botosn', 
          Specialty: 'Ortho',
          'Affiliated Accounts': 'Chop Care Network Speciality Care In Voorhees' 
        }
      ];
  return (
    <div className='flex flex-col gap-4 w-full p-2'>
        <div className='flex gap-4 w-full'>
            <div className='flex flex-col bg-white rounded-xl border-b border-x  border-gray-300 w-[20%] h-20 p-2 justify-between'>
                <div className='flex gap-2 items-center'>
                    <div className='bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center'>
                        <FaUserDoctor className='text-[#004567] h-[0.8rem] w-[0.8rem]'/>
                    </div>
                    <span className='text-gray-500 text-[11px] font-[500]'>
                        Rendering HCPs
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
                       Avg #Pats Treated per HCPs
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
                      #Referring HCPs
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
                       Avg #Pats Referred per HCPs
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
                #MoM SMA Treated Patients (12 months)
                </span>
                <ResponsiveContainer width="100%" height="90%">
                <LineChart data={MoMData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#2962FF" strokeWidth={2} />
                </LineChart>
                </ResponsiveContainer>
            </div>
            <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[40%] h-56 p-2">
                <div className='flex gap-2 items-center justify-between w-full pb-4'>
                    <span className='text-gray-500 text-[11px] font-[500]'>
                    #QoQ Patients By Brand
                    </span>
                    <div className='flex gap-2 items-center'>
                    <div className='flex gap-1 items-center'>
                        <div className='bg-[#004567] rounded-full w-2 h-2'></div>
                        <span className='text-[10px] text-gray-600'>Zolgensma</span>
                    </div>
                    <div className='flex gap-1 items-center'>
                        <div className='bg-[#8295ae] rounded-full w-2 h-2'></div>
                        <span className='text-[10px] text-gray-600'>Spinraza</span>
                    </div>
                    <div className='flex gap-1 items-center'>
                        <div className='bg-[#5aa687] rounded-full w-2 h-2'></div>
                        <span className='text-[10px] text-gray-600'>Evrysdi</span>
                    </div>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height="90%" style={{marginLeft:-10,marginBottom: -20}}>
                    <BarChart data={QoQdata}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="quarter" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />

                    <Bar dataKey="Zolgensma" stackId="a" fill="#004567" />
                    <Bar dataKey="Spinraza" stackId="a" fill="#8295ae" />
                    <Bar dataKey="Evrysdi" stackId="a" fill="#5aa687" radius={[10, 10, 0, 0]}/>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="flex gap-4 w-full">
            <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[30%] h-56 p-2">
               
                <span className="text-gray-500 text-[11px] font-[500] pb-4">
                    HCP segment by SMA patient Potential
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

            <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[30%] h-56 p-2">
                <div className='flex gap-2 items-center justify-between w-full pb-4'>
                    <span className="text-gray-500 text-[11px] font-[500]">
                    HCP Split by Segment and Age Group
                    </span>
                    <div className='flex gap-2 items-center'>
                        <div className='flex gap-1 items-center'>
                            <div className='bg-[#2c84b0] rounded-full w-2 h-2'></div>
                            <span className='text-[10px] text-gray-600'>{"<2"}</span>
                        </div>
                        <div className='flex gap-1 items-center'>
                            <div className='bg-[#8295ae] rounded-full w-2 h-2'></div>
                            <span className='text-[10px] text-gray-600'>{"3-17"}</span>
                        </div>
                        <div className='flex gap-1 items-center'>
                            <div className='bg-[#addaf0] rounded-full w-2 h-2'></div>
                            <span className='text-[10px] text-gray-600'>{">18"}</span>
                        </div>
                    </div>
                </div>

                <ResponsiveContainer width="100%" height="100%" style={{marginLeft:-10,marginBottom: -20}}>
                    <BarChart data={hcpsplit_age}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="quarter" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />

                    <Bar dataKey="<2" stackId="a" fill="#2c84b0" />
                    <Bar dataKey="3-17" stackId="a" fill="#8295ae" />
                    <Bar dataKey=">18" stackId="a" fill="#addaf0" radius={[10, 10, 0, 0]}/>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-[40%] h-56 p-2">
                <div className='flex gap-4 items-center justify-between w-full pb-4'>
                    <div>
                    <span className="text-gray-500 text-[11px] font-[500] text-wrap">
                        HCP Split by Segment and Specialty
                    </span>
                    </div>
                    
                    <div className='flex gap-2 items-center flex-wrap justify-end'>
                        <div className='flex gap-1 items-center'>
                            <div className='bg-[#2c84b0] rounded-full w-2 h-2'></div>
                            <span className='text-[10px] text-gray-600'>PCP</span>
                        </div>
                        <div className='flex gap-1 items-center'>
                            <div className='bg-[#8295ae] rounded-full w-2 h-2'></div>
                            <span className='text-[10px] text-gray-600'>Pediatric</span>
                        </div>
                        <div className='flex gap-1 items-center'>
                            <div className='bg-[#addaf0] rounded-full w-2 h-2'></div>
                            <span className='text-[10px] text-gray-600'>All Others</span>
                        </div>
                        <div className='flex gap-1 items-center'>
                            <div className='bg-[#e7caed] rounded-full w-2 h-2'></div>
                            <span className='text-[10px] text-gray-600'>Child Neurology</span>
                        </div>
                        <div className='flex gap-1 items-center'>
                            <div className='bg-[#bac8f5] rounded-full w-2 h-2'></div>
                            <span className='text-[10px] text-gray-600'>Neuromuscular</span>
                        </div>
                        <div className='flex gap-1 items-center'>
                            <div className='bg-[#addaf0] rounded-full w-2 h-2'></div>
                            <span className='text-[10px] text-gray-600'>NP/PA</span>
                        </div>
                    </div>
                </div>

                <ResponsiveContainer width="100%" height="100%" style={{ marginRight: -10,marginBottom: -20 }}>
                    <BarChart data={hcpsplit_specialty_data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="quarter" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ fontSize: 10 }} itemStyle={{ fontSize: 10 }} />

                        <Bar dataKey="PCP" stackId="a" fill="#2c84b0" />
                        <Bar dataKey="Pediatric" stackId="a" fill="#8295ae" />
                        <Bar dataKey="All Others" stackId="a" fill="#addaf0" />
                        <Bar dataKey="Child Neurology" stackId="a" fill="#e7caed" />
                        <Bar dataKey="Neuromuscular" stackId="a" fill="#bac8f5" />
                        <Bar dataKey="NP/PA" stackId="a" fill="#addaf0" radius={[10, 10, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="flex flex-col bg-white rounded-xl border border-gray-300 w-full shadow-sm">
                   
            <div className="flex gap-2 items-center p-2">
                <div className="bg-blue-100 rounded-full h-[1.2rem] w-[1.2rem] flex p-1 justify-center items-center">
                    <FaUserDoctor className="text-[#004567] h-[0.8rem] w-[0.8rem]" />
                </div>
                <span className="text-gray-500 text-[11px] font-[500]">
                    HCPs List
                </span>
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