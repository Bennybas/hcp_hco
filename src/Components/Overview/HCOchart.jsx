import React, { useMemo } from 'react';

const HCOchart = ({ HCOdata }) => {
    const formatTierName = (tier) => {
        if (!tier || tier.trim() === '-') return 'Unknown';

        tier = tier.trim();

        if (/^tier \d+$/i.test(tier)) {
            return tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
        }

        const tierMatch = tier.match(/\d+/);
        if (tierMatch) {
            return `Tier ${tierMatch[0]}`;
        }
        
        return tier;
    };

    const tierData = useMemo(() => {
        if (!HCOdata || !Array.isArray(HCOdata) || HCOdata.length === 0) {
            return [];
        }

        const tierPatientMap = new Map();

        HCOdata.forEach(record => {
            if (record.hco_mdm_tier && record.patient_id) {
                const tier = formatTierName(record.hco_mdm_tier);

                if (!tierPatientMap.has(tier)) {
                    tierPatientMap.set(tier, new Set());
                }
                tierPatientMap.get(tier).add(record.patient_id);
            }
        });
        
        const result = Array.from(tierPatientMap).map(([name, patientSet]) => ({
            name,
            value: patientSet.size
        }));

        result.sort((a, b) => {
            const aNum = parseInt(a.name.match(/\d+/)?.[0] || '9999');
            const bNum = parseInt(b.name.match(/\d+/)?.[0] || '9999');
            return aNum - bNum;
        });
        
        return result;
    }, [HCOdata]);

    const maxValue = Math.max(...tierData.map(item => item.value), 1);

    return (
        <div className="flex flex-col bg-white rounded-xl border-b border-x border-gray-300 w-full h-48 p-2 justify-between">
            {/* Header */}
            <div className="flex gap-2 items-center mb-2">
                <div className="bg-blue-100 rounded-full h-6 w-6 p-1 flex justify-center items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" className="text-blue-800 h-4 w-4">
                        <path fill="currentColor" d="M142.4 21.9c5.6 16.8-3.5 34.9-20.2 40.5L96 71.1V192c0 53 43 96 96 96s96-43 96-96V71.1l-26.1-8.7c-16.8-5.6-25.8-23.7-20.2-40.5s23.7-25.8 40.5-20.2l26.1 8.7C334.4 19.1 352 43.5 352 71.1V192c0 77.2-54.6 141.6-127.3 156.7C231 404.6 278.4 448 336 448c61.9 0 112-50.1 112-112V265.3c-28.3-12.3-48-40.5-48-73.3c0-44.2 35.8-80 80-80s80 35.8 80 80c0 32.8-19.7 61-48 73.3V336c0 97.2-78.8 176-176 176c-92.9 0-168.9-71.9-175.5-163.1C87.2 334.2 32 269.6 32 192V71.1c0-27.5 17.6-52 43.8-60.7l26.1-8.7c16.8-5.6 34.9 3.5 40.5 20.2zM480 224c17.7 0 32-14.3 32-32s-14.3-32-32-32s-32 14.3-32 32s14.3 32 32 32z"/>
                    </svg>
                </div>
                <span className="text-gray-500 text-xs font-medium">
                    HCO Tier by Treated Patient Volume
                </span>
            </div>

            {/* Chart Container */}
            <div className="flex-grow">
                <div className="h-full w-full flex items-center justify-center">
                    {tierData.length > 0 ? (
                        <div className="w-full">
                            {tierData.map((item, index) => (
                                <div key={index} className="flex items-center mb-2">
                                    <div className="w-16 text-xs text-gray-600">{item.name}</div>
                                    <div className="flex-grow">
                                        <div 
                                            className="bg-[#004567] h-5 rounded-md" 
                                            style={{ 
                                                width: `${Math.max((item.value / maxValue) * 100, 5)}%`,
                                                transition: 'width 0.5s ease-in-out' 
                                            }}
                                        >
                                            <div className="pl-2 h-full flex items-center">
                                                <span className="text-xs text-white font-medium">
                                                    {item.value}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-gray-500">No data available</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HCOchart;
