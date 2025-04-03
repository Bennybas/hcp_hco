import { ArrowLeft } from 'lucide-react'
import React,{useState} from 'react'
import { useNavigate } from 'react-router-dom'
import {  PieChart, Pie, Cell,BarChart, Bar,LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,Legend } from 'recharts';

const HCPdeepDive = () => {
    const navigate = useNavigate();

    const quarterlyPatientTrendData = [
        { quarter: 'Q1 24', 'Treated Patients': 225, 'Zolgensma': 129, 'Spinraza': 175, 'Evrysdi': 185 },
        { quarter: 'Q2 24', 'Treated Patients': 213, 'Zolgensma': 151, 'Spinraza': 210, 'Evrysdi': 232 },
        { quarter: 'Q3 24', 'Treated Patients': 245, 'Zolgensma': 210, 'Spinraza': 170, 'Evrysdi': 184 },
        { quarter: 'Q4 24', 'Treated Patients': 248, 'Zolgensma': 184, 'Spinraza': 178, 'Evrysdi': 197 }
    ];

    const ageData = [
        { category: "<2", value: 40 },
        { category: "2-18", value: 70 },
        { category: ">18", value: 30 }
      ];
      const drugData = [
        { category: "Zolgensma", value: 60 },
        { category: "Spinraza", value: 80 },
        { category: "Evrysdi", value: 50 }
      ];

      const scientificData = [
        { category: "Publications", value: 20 },
        { category: "Clinical Trials", value: 35 },
        { category: "Congress", value: 25 }
      ];


    const [activeTab, setActiveTab] = useState('all');

  const tableData = [
    { 
      hcpName: 'CRYSTAL PROUD', 
      specialty: 'NEUROLOGY', 
      patientsReferred: 5, 
      affiliatedAccount: 'SENTARA HOSPITALS' 
    },
    { 
      hcpName: 'ERIN NEIL KNIERBEIN', 
      specialty: 'NEUROMUSCULAR', 
      patientsReferred: 7, 
      affiliatedAccount: 'REGENTS OF THE UNIVERSITY OF MICHIGAN' 
    },
    { 
      hcpName: 'SETH PERLMAN', 
      specialty: 'CHILD NEUROLOGY', 
      patientsReferred: 5, 
      affiliatedAccount: 'CHILDRENS HOSPITAL REGIONAL MEDICAL CENTER' 
    }
  ];
    
  return (
    <div className='p-4 bg-gray-100'>
        {/* Back Button */}
        <button 
        onClick={() => navigate('/')}
        className='flex gap-2 py-2 px-1 items-center'>
            <ArrowLeft className='w-4 h-4 text-gray-600'/>
            <span className='text-gray-700 text-[12px]'>Back</span>
        </button>

        {/* Main Layout */}
        <div className='w-full flex gap-4'>
            
            {/* Left Section (20% width - Updated) */}
            <div className="w-[20%] h-screen bg-white rounded-2xl relative">
                {/* Background Image (HCP-HCO) */}
                <img
                    src="hcp-hco.jpg"
                    alt="hcp-hco"
                    className="h-16 w-full rounded-t-2xl"
                />

                <div className='absolute -mt-8 ml-3'>
                    <img src="image.jpg" alt="img" className="h-20 w-20 rounded-full" >
                    </img>
                </div>

                {/* HCP Details */}
                <div className="mt-12 p-4">
                    <span className="text-[14px] font-semibold text-gray-900">Haylie Ross</span>
                    <span className="text-[10px] text-gray-500 block">Child Neurologist</span>
                    <hr className="border-gray-300 w-full my-2" />

                    {/* NPI & Cluster */}
                    <div className="flex justify-between w-full text-[10px] text-gray-600">
                        <span>NPI</span>
                        <span>HCP Tier/Cluster</span>
                    </div>
                    <div className="flex justify-between w-full text-[12px] font-semibold text-gray-900">
                        <span>12165854</span>
                        <span>High</span>
                    </div>
                    <hr className="border-gray-300 w-full my-2" />

                    {/* Affiliation */}
                    <div className="text-[10px] text-gray-600">Affiliation</div>
                    <div className="text-[12px] font-semibold text-gray-900">
                        LE BONHEUR CHILDRENS HOSPITAL
                    </div>
                    <hr className="border-gray-300 w-full my-2" />

                    {/* Other Details */}
                    {[
                        { label: "Zolgensma user", value: "Yes" },
                        { label: "NVS Target", value: "Yes" },
                        { label: "KOL", value: "Yes" },
                    ].map((item, index) => (
                        <div key={index} className="w-full">
                            <div className="text-[10px] text-gray-600">{item.label}</div>
                            <div className="text-[12px] font-semibold text-gray-900">{item.value}</div>
                            <hr className="border-gray-300 w-full my-2" />
                        </div>
                    ))}

                    {/* Address */}
                    <div className="text-[10px] text-gray-600">Address</div>
                    <div className="text-[12px] font-semibold text-gray-900 leading-tight">
                        2583 S VOLUSIA AVE, STE 300, FL, 32763
                    </div>
                </div>
            </div>

            
            <div className='w-[80%] h-screen bg-white rounded-2xl overflow-y-auto'>
                <div className=' flex flex-col gap-4 p-4'>
                    <div className="flex flex-col w-full h-56 p-2">
                        <span className="text-gray-700 text-[11px] font-[500] pb-4">
                            #Treated Patients
                        </span>
                        <ResponsiveContainer width="100%" height="90%" style={{marginLeft:-10}}>
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

                    <div className='flex gap-2 w-full '>
                        <div className="w-full md:w-1/3 p-4 ">
                            <h2 className="text-gray-700 text-[11px] font-[500] pb-4">#Patients by Age</h2>
                            <div className="-ml-8">
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={ageData}>
                                <XAxis dataKey="category" tick={{ fontSize: 10 }}/>
                                <YAxis tick={{ fontSize: 10 }}/>
                                <Tooltip contentStyle={{ fontSize: 10 }} itemStyle={{ fontSize: 10 }}/>
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
                                <XAxis dataKey="category" tick={{ fontSize: 10 }}/>
                                <YAxis tick={{ fontSize: 10 }}/>
                                <Tooltip contentStyle={{ fontSize: 10 }} itemStyle={{ fontSize: 10 }}/>
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
                                <XAxis dataKey="category" tick={{ fontSize: 10 }}/>
                                <YAxis tick={{ fontSize: 10 }}/>
                                <Tooltip contentStyle={{ fontSize: 10 }} itemStyle={{ fontSize: 10 }}/>
                                <Bar dataKey="value" fill="#3680ba" barSize={40} radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                            </div>
                        </div>

                    </div>
                    <hr className="border-gray-300 w-full -mt-6" />


                    <div className="p-4">
                        <div className='flex gap-2 items-center py-2'>
                            <div className="text-gray-700 text-[11px] font-medium ">
                                Patients Referral Out
                            </div>

                            <div className="flex space-x-2">
                                <button 
                                className={`px-4 py-2 rounded-full text-[10px]  ${activeTab === 'all' ? 'bg-[#3680ba] text-white' : 'bg-gray-200 text-gray-700'}`}
                                onClick={() => setActiveTab('all')}
                                >
                                All Referrals
                                </button>
                                <button 
                                className={`px-4 py-2 rounded-full text-[10px] ${activeTab === 'within' ? 'bg-[#3680ba] text-white' : 'bg-gray-200 text-gray-700'}`}
                                onClick={() => setActiveTab('within')}
                                >
                                Within Institute
                                </button>
                                <button 
                                className={`px-4 py-2 rounded-full text-[10px]  ${activeTab === 'outside' ? 'bg-[#3680ba] text-white' : 'bg-gray-200 text-gray-700'}`}
                                onClick={() => setActiveTab('outside')}
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
                            {tableData.map((row, index) => (
                            <tr key={index} className="border-t border-gray-200">
                                <td className="px-4 py-3 text-[10px]">{row.hcpName}</td>
                                <td className="px-4 py-3 text-[10px]">{row.specialty}</td>
                                <td className="px-4 py-3 text-[10px]">{row.patientsReferred}</td>
                                <td className="px-4 py-3 text-[10px]">{row.affiliatedAccount}</td>
                            </tr>
                            ))}
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
