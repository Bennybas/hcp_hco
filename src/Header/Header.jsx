import React, { useState, useEffect } from "react";
import { FcBusinessman } from "react-icons/fc";
import { CiViewTable } from "react-icons/ci";
import { TbZoomPan } from "react-icons/tb";
import { FaUserDoctor } from "react-icons/fa6";
import { GrUserAdmin } from "react-icons/gr";
import Overview from "../Components/Overview/Overview";
import HCPlandscape from "../Components/HCPLandscape/HCPlandscape";
import AccountLandscape from "../Components/AccountLandscape/AccountLandscape";
import ReferOut from "../Components/ReferOut/ReferOut";
import { Bell, ChevronDown, Search } from "lucide-react";


const Header = () => {
  const [activePage, setActivePage] = useState(() => {
    return localStorage.getItem("activePage") || "Overview";
  });
  
  const [activeReferType, setActiveReferType] = useState("HCP");
  const [pageData, setPageData] = useState(null);

  useEffect(() => {
    localStorage.setItem("activePage", activePage);
  }, [activePage]);

  const switchPage = (page, data = null) => {
    setActivePage(page);
    setPageData(data); 
  };

  const cards = [
    {
      title: "Overview",
      Icon: CiViewTable,
      path: "Overview",
    },
   
    {
      title: "HCP Landscape",
      Icon: FaUserDoctor,
      path: "hcp",
    },
    {
      title: "Account Landscape",
      Icon: GrUserAdmin,
      path: "account",
    },
    {
      title: "Refer Out Network",
      Icon: TbZoomPan,
      path: "refer",
    },
  ];

  const referralTypes = [
    { title: "HCP" },
    { title: "HCO" }
  ];

  const renderContent = () => {
    switch (activePage) {
      case "Overview":
        return <Overview />;
      case "hcp":
        return <HCPlandscape />
      case "account":
        return <AccountLandscape />
      case "refer":
        return <ReferOut referType={activeReferType} />
    }
  };

  return (
    <div className="bg-gray-100 pb-4">
      <div>
        <header className="text-gray-600 flex items-center justify-between px-6 py-3">
          {/* Logo Section */}
          <img src="/logo.svg" alt="Logo" className="h-4 w-auto" />

          {/* Navigation Cards */}
          <div className="flex flex-row justify-center items-center w-84 gap-1 px-1 py-1">
            {cards.map((card, index) => (
              <div key={index} className="flex flex-row items-center">
                <button
                  onClick={() => setActivePage(card.path)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-3xl transition-all duration-200 ease-in-out 
                    ${activePage === card.path
                      ? "bg-[#0460A9] text-[#f0f3f7] text-md"
                      : "text-[#697280] bg-white hover:bg-[#0460A9]/80 hover:text-[#f0f3f7]"
                    }`}
                >
                  <card.Icon className="text-md" />
                  <span className="text-sm" style={{ fontSize: '11px' }}>{card.title}</span>
                </button>
                
                {activePage === 'refer' && card.path === 'refer' && (
                  <div className="flex ml-1 gap-2">
                    {referralTypes.map((type, typeIndex) => (
                      <button
                        key={typeIndex}
                        onClick={() => setActiveReferType(type.title)}
                        className={`flex items-center gap-2 px-2 py-1 rounded-3xl transition-all duration-200 ease-in-out 
                          ${activeReferType === type.title
                            ? "bg-[#0460A9] text-[#f0f3f7] text-md"
                            : "text-[#697280] bg-white hover:bg-[#0460A9]/80 hover:text-[#f0f3f7]"
                          }`}
                      >
                        <span className="text-sm" style={{ fontSize: '10px' }}>{type.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Right Side Section with User Info */}
          <div className="flex flex-row items-center gap-3">
            <div className="flex bg-white rounded-full w-8 h-8 p-2 border border-gray-300 items-center">
              <Search className="w-4 h-4 text-gray-500 text-center"/>
            </div>
            <div className="flex bg-white rounded-full w-8 h-8 p-2 border border-gray-300 items-center">
              <Bell className="w-4 h-4 text-gray-500 text-center"/>
            </div>
            <button className="p-1 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors duration-200 bg-white flex px-2 items-center gap-2">
              <ChevronDown className="text-gray-500 w-4 h-4"/>
              
                <FcBusinessman className="text-3xl" />
            </button>
          </div>
        </header>
      </div>
      {/* Navigation Content */}
      <main className="mt-4 px-4">{renderContent()}</main>
    </div>
  );
};

export default Header;