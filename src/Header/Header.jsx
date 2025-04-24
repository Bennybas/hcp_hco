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
  const [selectedFavorite, setSelectedFavorite] = useState(null);

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
        return <HCPlandscape selectedFavorite={selectedFavorite} />;
      case "account":
        return <AccountLandscape selectedFavorite={selectedFavorite} />;
      case "refer":
        return <ReferOut referType={activeReferType} />;
      default:
        return <Overview />;
    }
  };

  const [showDropdown, setShowDropdown] = useState(false);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [favorites, setFavorites] = useState({
    hcp: [],
    account: []
  });
  const userIconRef = React.useRef(null);
  const dropdownRef = React.useRef(null);

  useEffect(() => {
    // Load favorites from both landscapes
    const storedHCPFavorites = localStorage.getItem("hcpLandscapeFavorites");
    const storedAccountFavorites = localStorage.getItem("accountLandscapeFavorites");
    
    const hcpFavs = storedHCPFavorites ? JSON.parse(storedHCPFavorites) : [];
    const accountFavs = storedAccountFavorites ? JSON.parse(storedAccountFavorites) : [];
    
    setFavorites({
      hcp: hcpFavs,
      account: accountFavs
    });
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showDropdown && 
        userIconRef.current && 
        !userIconRef.current.contains(event.target) &&
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const removeFavorite = (type, index) => {
    const updatedFavorites = {...favorites};
    updatedFavorites[type] = [...favorites[type]];
    updatedFavorites[type].splice(index, 1);
    setFavorites(updatedFavorites);
    
    // Update localStorage
    localStorage.setItem(
      type === 'hcp' ? "hcpLandscapeFavorites" : "accountLandscapeFavorites", 
      JSON.stringify(updatedFavorites[type])
    );
  };

  const applyFavorite = (type, favorite) => {
    // Set the selected favorite to pass to the corresponding component
    setSelectedFavorite(favorite);
    
    // Navigate to the corresponding page
    setActivePage(type === 'hcp' ? 'hcp' : 'account');
    
    // Close the modal
    setShowFavoritesModal(false);
  };

  const getFilterSummary = (filters) => {
    if (!filters) return "No filters applied";
    
    // This is a placeholder - implement actual filter summary logic based on your filter structure
    return Object.entries(filters)
      .filter(([key, value]) => value !== null && value !== undefined && value !== "")
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
      .join(" • ");
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
                  onClick={() => {
                    setActivePage(card.path);
                    // Clear selected favorite when switching pages
                    setSelectedFavorite(null);
                  }}
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
          <div className="flex flex-row items-center gap-3 relative">
            <button
              ref={userIconRef}
              className="p-1 bg-white rounded-full hover:bg-gray-300 transition-colors duration-200 flex px-2 items-center gap-2"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <ChevronDown className="text-gray-500 w-4 h-4" />
              <FcBusinessman className="text-3xl" />
            </button>

            {showDropdown && (
              <div 
                ref={dropdownRef}
                className="absolute right-0 top-full mt-1 w-64 bg-white shadow-lg rounded-xl p-4 z-50"
                style={{ boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
              >
                <div className="font-semibold text-gray-800 mb-3">Account: Chryselys</div>

                <button
                  className="w-full text-sm text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 py-2 px-3 rounded-lg transition-colors"
                  onClick={() => {
                    setShowFavoritesModal(true);
                    setShowDropdown(false);
                  }}
                >
                  View Favorites
                </button>
              </div>
            )}
          </div>
        </header>
      </div>
      
      {/* Navigation Content */}
      <main className="mt-4 px-4">{renderContent()}</main>

      {/* Favorites Modal */}
      {showFavoritesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">My Favorites</h3>
              <button onClick={() => setShowFavoritesModal(false)} className="text-gray-400 hover:text-gray-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <div className="flex border-b">
                <button 
                  className={`px-4 py-2 font-medium ${favorites.hcp.length > 0 ? 'text-blue-600' : 'text-gray-500'} border-b-2 border-blue-600`}
                >
                  HCP Favorites {favorites.hcp.length > 0 && `(${favorites.hcp.length})`}
                </button>
                <button 
                  className={`px-4 py-2 font-medium ${favorites.account.length > 0 ? 'text-blue-600' : 'text-gray-500'}`}
                >
                  Account Favorites {favorites.account.length > 0 && `(${favorites.account.length})`}
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {/* HCP Favorites Section */}
              <div>
                <h4 className="font-medium text-gray-700 mb-2">HCP Favorites</h4>
                {favorites.hcp.length === 0 ? (
                  <p className="text-center text-gray-500 py-4 bg-gray-50 rounded-lg">You haven't saved any HCP favorites yet.</p>
                ) : (
                  <div className="space-y-3">
                    {favorites.hcp.map((favorite, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900">{favorite.name}</h4>
                            <p className="text-xs text-gray-500">Saved on {favorite.timestamp || 'Unknown date'}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => applyFavorite('hcp', favorite)}
                              className="text-sm text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg transition-colors"
                            >
                              Apply
                            </button>
                            <button
                              onClick={() => removeFavorite('hcp', index)}
                              className="text-sm text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="mt-2">
                          <p className="text-xs text-gray-600 break-words">{getFilterSummary(favorite.filters)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Account Favorites Section */}
              <div className="mt-6">
                <h4 className="font-medium text-gray-700 mb-2">Account Favorites</h4>
                {favorites.account.length === 0 ? (
                  <p className="text-center text-gray-500 py-4 bg-gray-50 rounded-lg">You haven't saved any Account favorites yet.</p>
                ) : (
                  <div className="space-y-3">
                    {favorites.account.map((favorite, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900">{favorite.name}</h4>
                            <p className="text-xs text-gray-500">Saved on {favorite.timestamp || 'Unknown date'}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => applyFavorite('account', favorite)}
                              className="text-sm text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg transition-colors"
                            >
                              Apply
                            </button>
                            <button
                              onClick={() => removeFavorite('account', index)}
                              className="text-sm text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="mt-2">
                          <p className="text-xs text-gray-600 break-words">{getFilterSummary(favorite.filters)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Header;